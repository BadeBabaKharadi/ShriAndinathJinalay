const { getFirestore } = require("firebase-admin/firestore");
const { onCall, onRequest } = require("firebase-functions/v2/https");
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
const adminOptions = () => ({ ...publicOptions(), secrets: [ADMIN_ACCESS_KEY] });
const handle = fn => onCall(fn.options, async request => {
  try {
    return await fn.run(request);
  } catch (error) {
    throw error;
  }
});

module.exports = {
  pratibhaConfig: onCall(publicOptions(), async () =>
    pratibha.getPublicConfig({ db: getFirestore() })),
  pratibhaCreate: onCall({ ...publicOptions(), timeoutSeconds: 60, memory: "512MiB" }, async request =>
    pratibha.createApplication({ db: getFirestore(), data: request.data || {} })),
  pratibhaFindByMobile: onCall(publicOptions(), async request => {
    const data = request.data || {};
    return pratibha.findApplicationByMobile({
      db: getFirestore(),
      mobileNumber: data.mobileNumber,
    });
  }),
  pratibhaGet: onCall(publicOptions(), async request => {
    const data = request.data || {};
    return pratibha.getApplication({
      db: getFirestore(),
      applicationId: data.applicationId,
      accessToken: data.accessToken,
    });
  }),
  pratibhaUpdate: onCall({ ...publicOptions(), timeoutSeconds: 60, memory: "512MiB" }, async request => {
    const data = request.data || {};
    return pratibha.updateApplication({
      db: getFirestore(),
      applicationId: data.applicationId,
      accessToken: data.accessToken,
      data,
    });
  }),
  pratibhaAdminConfig: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.adminConfig({
      db: getFirestore(),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
    });
  }),
  pratibhaAdminSaveConfig: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.saveConfig({
      db: getFirestore(),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      value: data.value || {},
    });
  }),
  pratibhaAdminSaveRule: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.saveRule({
      db: getFirestore(),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      id: data.id,
      hindi: data.hindi,
      displayOrder: data.displayOrder,
      active: data.active,
    });
  }),
  pratibhaAdminStats: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.stats({
      db: getFirestore(),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
    });
  }),
  pratibhaAdminList: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.adminList({
      db: getFirestore(),
      accessKey: data.accessKey,
      expectedKey: ADMIN_ACCESS_KEY.value(),
      status: data.status,
      filter: data.filter,
    });
  }),
  pratibhaAdminGet: onCall(adminOptions(), async request => {
    const data = request.data || {};
    return pratibha.adminGet({
      db: getFirestore(),
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
        db: getFirestore(),
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
      db: getFirestore(),
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
