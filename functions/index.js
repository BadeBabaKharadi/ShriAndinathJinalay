const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");

const {
  createRegistration,
  lookupRegistration,
  updateRegistration,
} = require("./registration");

initializeApp();

setGlobalOptions({
  region: "asia-south1",
  maxInstances: 10,
  timeoutSeconds: 15,
  memory: "256MiB",
});

const ALLOWED_ORIGINS = [
  "https://badebabakharadi.com",
  "https://www.badebabakharadi.com",
];

function callableOptions() {
  return { cors: ALLOWED_ORIGINS };
}

function mapError(error) {
  if (error instanceof HttpsError) return error;

  const messages = new Map([
    ["This mobile number is already registered.", "already-exists"],
    ["Registration not found.", "not-found"],
    ["Registration has not opened yet.", "failed-precondition"],
    ["Registration is closed.", "failed-precondition"],
  ]);

  const code = messages.get(error.message);
  if (code) throw new HttpsError(code, error.message);

  if (
    /Invalid|required|does not match|inconsistent|counter|not configured/.test(
      error.message,
    )
  ) {
    throw new HttpsError("invalid-argument", error.message);
  }

  console.error("Kshamawani registration error", error);
  throw new HttpsError("internal", "Registration service failed.");
}

exports.kshamawaniLookup = onCall(callableOptions(), async (request) => {
  try {
    const { eventId, mobile } = request.data || {};
    return await lookupRegistration({
      db: getFirestore(),
      eventId,
      mobile,
    });
  } catch (error) {
    return mapError(error);
  }
});

exports.kshamawaniCreate = onCall(callableOptions(), async (request) => {
  try {
    return await createRegistration({
      db: getFirestore(),
      data: request.data || {},
    });
  } catch (error) {
    return mapError(error);
  }
});

exports.kshamawaniUpdate = onCall(callableOptions(), async (request) => {
  try {
    return await updateRegistration({
      db: getFirestore(),
      data: request.data || {},
    });
  } catch (error) {
    return mapError(error);
  }
});
