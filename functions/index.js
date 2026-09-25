const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");

const {
  createRegistration,
  lookupRegistration,
  updateRegistration,
} = require("./registration");
const {
  coordinatorLookup,
  deleteRegistration,
  findRegistrationByMobile,
  getAdminStats,
  issueTokens,
} = require("./admin");

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
  "https://badebabakharadi.github.io",
];

const ADMIN_ACCESS_KEY = defineSecret("KSHAMAWANI_ADMIN_KEY");

function callableOptions() {
  return { cors: ALLOWED_ORIGINS };
}

function protectedCallableOptions() {
  return { ...callableOptions(), secrets: [ADMIN_ACCESS_KEY] };
}

function mapError(error) {
  if (error instanceof HttpsError) return error;

  const messages = new Map([
    ["This mobile number is already registered.", "already-exists"],
    ["Registration not found.", "not-found"],
    ["Registration has not opened yet.", "failed-precondition"],
    ["Registration is closed.", "failed-precondition"],
    ["Unauthorized.", "permission-denied"],
    ["Issued-token registrations cannot be deleted.", "failed-precondition"],
    ["Tokens have already been issued.", "failed-precondition"],
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

exports.kshamawaniCoordinatorLookup = onCall(
  protectedCallableOptions(),
  async (request) => {
    try {
      const data = request.data || {};
      return await coordinatorLookup({
        db: getFirestore(),
        applicationCode: data.applicationCode,
        mobile: data.mobile,
        accessKey: data.accessKey,
        expectedKey: ADMIN_ACCESS_KEY.value(),
      });
    } catch (error) {
      return mapError(error);
    }
  },
);

exports.kshamawaniIssue = onCall(
  protectedCallableOptions(),
  async (request) => {
    try {
      const data = request.data || {};
      return await issueTokens({
        db: getFirestore(),
        applicationCode: data.applicationCode,
        accessKey: data.accessKey,
        expectedKey: ADMIN_ACCESS_KEY.value(),
        issuedBy: data.issuedBy || "COORDINATOR",
      });
    } catch (error) {
      return mapError(error);
    }
  },
);

exports.kshamawaniAdminStats = onCall(
  protectedCallableOptions(),
  async (request) => {
    try {
      const data = request.data || {};
      return await getAdminStats({
        db: getFirestore(),
        eventId: data.eventId,
        accessKey: data.accessKey,
        expectedKey: ADMIN_ACCESS_KEY.value(),
      });
    } catch (error) {
      return mapError(error);
    }
  },
);

exports.kshamawaniAdminLookup = onCall(
  protectedCallableOptions(),
  async (request) => {
    try {
      const data = request.data || {};
      return await findRegistrationByMobile({
        db: getFirestore(),
        mobile: data.mobile,
        accessKey: data.accessKey,
        expectedKey: ADMIN_ACCESS_KEY.value(),
      });
    } catch (error) {
      return mapError(error);
    }
  },
);

exports.kshamawaniAdminDelete = onCall(
  protectedCallableOptions(),
  async (request) => {
    try {
      const data = request.data || {};
      return await deleteRegistration({
        db: getFirestore(),
        registrationId: data.registrationId,
        accessKey: data.accessKey,
        expectedKey: ADMIN_ACCESS_KEY.value(),
      });
    } catch (error) {
      return mapError(error);
    }
  },
);
