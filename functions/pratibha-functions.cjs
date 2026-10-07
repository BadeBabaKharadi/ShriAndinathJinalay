const { getFirestore } = require("firebase-admin/firestore");
const { FIRESTORE_DATABASE_ID } = require("./config");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const pratibha = require("./pratibha.cjs");

const ADMIN_ACCESS_KEY = defineSecret("KSHAMAWANI_ADMIN_KEY");
const origins = [
  "https://badebabakharadi.com",
  "https://www.badebabakharadi.com",
  "https://babakharadi.com",
  "https://www.babakharadi.com",
  "https://badebabakharadi.github.io",
];
const publicOptions = () => ({ cors: origins });

// Only messages that are intentionally produced for end users may cross the
// public callable boundary. Unexpected errors (including Google/IAM/Storage
// errors) are logged server-side and replaced with a safe generic message.
const PUBLIC_ERROR_PATTERNS = [
  /^Required field missing: [A-Za-z][A-Za-z0-9]*$/,
  /^Invalid mobile number\.$/,
  /^Invalid PIN code\.$/,
  /^कक्षा केवल 10वीं या 12वीं हो सकती है।$/,
  /^Overall percentage must be between 0 and 100\.$/,
  /^कक्षा (10|12)वीं के लिए न्यूनतम (80|85)% आवश्यक है।$/,
  /^Face photo is required\.$/,
  /^Maximum 10 supporting documents are allowed\.$/,
  /^एक Aadhaar और एक marksheet अनिवार्य है।$/,
  /^Invalid upload\.$/,
  /^Unsupported file type\.$/,
  /^File is too large\.$/,
  /^Form submission is currently paused\.$/,
  /^Form submission has not opened yet\.$/,
  /^Registration is closed\.$/,
  /^A registration already exists for this mobile number\. Please search the existing registration and edit it\.$/,
  /^All active rules must be accepted\.$/,
  /^Application not found\.$/,
  /^Unauthorized\.$/,
  /^Multiple registrations found for this mobile number\. Please contact the coordinator\.$/,
  /^Finalized applications cannot be edited\.$/,
];

const publicErrorMessage = error => {
  const message = String(error?.message || "").trim();
  return PUBLIC_ERROR_PATTERNS.some(pattern => pattern.test(message)) ? message : null;
};

const publicCall = fn => async request => {
  try {
    return await fn(request);
  } catch (error) {
    if (error instanceof HttpsError) throw error;

    const safeMessage = publicErrorMessage(error);
    if (safeMessage) {
      throw new HttpsError("invalid-argument", safeMessage);
    }

    console.error("Pratibha public callable failed", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    throw new HttpsError(
      "internal",
      "आवेदन सेवा में अभी तकनीकी समस्या है। कृपया कुछ देर बाद पुनः प्रयास करें।"
    );
  }
};
const adminOptions = () => ({ ...publicOptions(), secrets: [ADMIN_ACCESS_KEY] });
module.exports = {
  pratibhaConfig: onCall(publicOptions(), publicCall(async () =>
    pratibha.getPublicConfig({ db: getFirestore(undefined, FIRESTORE_DATABASE_ID) }))),
  pratibhaCreate: onCall({ ...publicOptions(), timeoutSeconds: 60, memory: "512MiB" }, publicCall(async request =>
    pratibha.createApplication({ db: getFirestore(undefined, FIRESTORE_DATABASE_ID), data: request.data || {} }))),
  pratibhaFindByMobile: onCall(publicOptions(), publicCall(async request => {
    const data = request.data || {};
    return pratibha.findApplicationByMobile({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      mobileNumber: data.mobileNumber,
    });
  })),
  pratibhaGet: onCall(publicOptions(), publicCall(async request => {
    const data = request.data || {};
    return pratibha.getApplication({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      applicationId: data.applicationId,
      accessToken: data.accessToken,
    });
  })),
  pratibhaUpdate: onCall({ ...publicOptions(), timeoutSeconds: 60, memory: "512MiB" }, publicCall(async request => {
    const data = request.data || {};
    return pratibha.updateApplication({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      applicationId: data.applicationId,
      accessToken: data.accessToken,
      data,
    });
  })),
  pratibhaAdminConfig: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.adminConfig({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
    });
  }),
  pratibhaAdminSaveConfig: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.saveConfig({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      value: data.value || {},
    });
  }),
  pratibhaAdminSaveRule: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.saveRule({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      id: data.id,
      hindi: data.hindi,
      displayOrder: data.displayOrder,
      active: data.active,
    });
  }),
  pratibhaAdminDeleteRule: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.deleteRule({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      id: data.id,
    });
  }),
  pratibhaAdminStats: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.stats({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
    });
  }),
  pratibhaAdminList: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.adminList({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      status: data.status,
      filter: data.filter,
    });
  }),
  pratibhaAdminGet: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.adminGet({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      applicationId: data.applicationId,
    });
  }),
  pratibhaAdminMedia: onRequest({ cors: true, secrets: [ADMIN_ACCESS_KEY], timeoutSeconds: 60, memory: "512MiB" }, async (request, response) => {
    try {
      if (request.method !== "POST") return response.status(405).send("Method Not Allowed");
      const data = request.body || {};
      const media = await pratibha.downloadMedia({
        db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
        accessKey: data.accessKey,
        expectedKey: ADMIN_ACCESS_KEY.value(),
        applicationId: data.applicationId,
        path: data.path,
      });
      response.set("Content-Type", media.contentType);
      response.set("Content-Disposition", `inline; filename="${String(media.name).replace(/["\\\\]/g, "")}"`);
      response.set("Cache-Control", "private, no-store");
      return response.status(200).send(media.buffer);
    } catch (error) {
      return response.status(403).json({ error: error.message || "Media access denied." });
    }
  }),
  pratibhaAdminReview: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.review({
      db: getFirestore(undefined, FIRESTORE_DATABASE_ID),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      applicationId: data.applicationId,
      status: data.status,
      overallPercentage: data.overallPercentage,
      score: data.score,
      comment: data.comment,
      clarification: data.clarification,
    });
  }),
};
