const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { FIRESTORE_DATABASE_ID } = require("./config");
const service = require("./event-registration.cjs");
const ADMIN_KEY = defineSecret("OCTOBER_EVENT_ADMIN_KEY");
const origins = ["https://badebabakharadi.com","https://www.badebabakharadi.com","https://babakharadi.com","https://www.babakharadi.com","https://badebabakharadi.github.io","http://localhost:5500","http://localhost:5501","http://localhost:5173","http://127.0.0.1:5500","http://127.0.0.1:5501","http://127.0.0.1:5173"];
const db = () => getFirestore(undefined, FIRESTORE_DATABASE_ID);
function handle(error) {
  if (error instanceof HttpsError) throw error;
  if (error.message === "Unauthorized.") throw new HttpsError("permission-denied", "Unauthorized.");
  if (/required|valid|must be|between|At least|Check-in|Aadhaar|traveller|Invalid registration/.test(error.message)) throw new HttpsError("invalid-argument", error.message);
  console.error("October event registration error", error);
  throw new HttpsError("internal", "Registration service failed.");
}
exports.octoberEventLookup = onCall({cors:true}, async request => {
  try { return await service.lookupRegistration({db:db(),kind:request.data?.kind,mobile:request.data?.mobile}); } catch(error) { return handle(error); }
});
exports.octoberEventSave = onCall({cors:true,timeoutSeconds:60,memory:"512MiB"}, async request => {
  try { return await service.saveRegistration({db:db(),kind:request.data?.kind,input:request.data||{}}); } catch(error) { return handle(error); }
});
exports.octoberEventVerifyAdmin = onCall({cors:origins,secrets:[ADMIN_KEY]}, async request => {
  try { if (!request.data?.accessKey || request.data.accessKey !== ADMIN_KEY.value()) throw new Error("Unauthorized."); return {verified:true}; } catch(error) { return handle(error); }
});
exports.octoberEventAdminList = onCall({cors:origins,secrets:[ADMIN_KEY]}, async request => {
  try { return await service.adminList({db:db(),kind:request.data?.kind,accessKey:request.data?.accessKey,expectedKey:ADMIN_KEY.value(),filter:request.data?.filter}); } catch(error) { return handle(error); }
});
exports.octoberEventAdminAadhaar = onCall({cors:origins,secrets:[ADMIN_KEY]}, async request => {
  try { return await service.adminAadhaarUrl({db:db(),mobile:request.data?.mobile,accessKey:request.data?.accessKey,expectedKey:ADMIN_KEY.value()}); } catch(error) { return handle(error); }
});