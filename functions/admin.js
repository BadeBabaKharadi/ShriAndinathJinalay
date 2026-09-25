const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

function assertAdminKey(providedKey, expectedKey) {
  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    throw new Error("Unauthorized.");
  }
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
}

function dateKey(value, timeZone = "Asia/Kolkata") {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function zonedHour(value, timeZone = "Asia/Kolkata") {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, partValue]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
  };
}

function addTrendBucket(collection, key, coupons) {
  if (!collection[key]) {
    collection[key] = { registrations: 0, coupons: 0 };
  }
  collection[key].registrations += 1;
  collection[key].coupons += coupons;
}

function serializeRegistration(data) {
  if (!data) return null;
  return {
    eventId: data.eventId,
    registrationId: data.applicationCode,
    applicationCode: data.applicationCode,
    mobile: data.mobile,
    name: data.name,
    address: data.address,
    coupons: Number(data.coupons || 0),
    tokensIssued: Boolean(data.tokensIssued),
    issuedAt: toDate(data.issuedAt)?.toISOString() || "",
    issuedBy: data.issuedBy || "",
    createdAt: toDate(data.createdAt)?.toISOString() || "",
    updatedAt: toDate(data.updatedAt)?.toISOString() || "",
  };
}

function verifyAccess({ accessKey, expectedKey }) {
  assertAdminKey(accessKey, expectedKey);
  return { verified: true };
}

async function coordinatorLookup({ db, applicationCode, mobile, expectedKey }) {
  assertAdminKey(applicationCode?.accessKey || mobile?.accessKey, expectedKey);
  const code = String(applicationCode?.value || "").trim();
  const normalizedMobile = normalizeMobile(mobile?.value);

  if (!/^KW26-\d{4}$/.test(code)) {
    throw new Error("Invalid application code.");
  }

  const snapshot = await db.collection("registrations").doc(code).get();
  if (!snapshot.exists) throw new Error("Registration not found.");

  const registration = snapshot.data();
  if (normalizedMobile && registration.mobile !== normalizedMobile) {
    throw new Error("QR code does not match the registration.");
  }

  return {
    exists: true,
    registration: serializeRegistration(registration),
  };
}

async function issueTokens({
  db,
  applicationCode,
  accessKey,
  expectedKey,
  issuedBy = "COORDINATOR",
}) {
  assertAdminKey(accessKey, expectedKey);
  const code = String(applicationCode || "").trim();

  if (!/^KW26-\d{4}$/.test(code)) {
    throw new Error("Invalid application code.");
  }

  let registration;
  const now = new Date();

  await db.runTransaction(async (transaction) => {
    const ref = db.collection("registrations").doc(code);
    const snapshot = await transaction.get(ref);

    if (!snapshot.exists) throw new Error("Registration not found.");

    const data = snapshot.data();
    if (data.tokensIssued === true) {
      throw new Error("Tokens have already been issued.");
    }

    transaction.update(ref, {
      tokensIssued: true,
      issuedAt: now,
      issuedBy: String(issuedBy || "COORDINATOR").slice(0, 80),
      updatedAt: now,
    });

    registration = {
      ...data,
      tokensIssued: true,
      issuedAt: now,
      issuedBy,
    };
  });

  return { registration: serializeRegistration(registration) };
}

async function getAdminStats({
  db,
  eventId = "kshamawani-2026",
  accessKey,
  expectedKey,
}) {
  assertAdminKey(accessKey, expectedKey);
  const snapshot = await db
    .collection("registrations")
    .where("eventId", "==", eventId)
    .get();

  let totalCouponsBooked = 0;
  let totalPhysicalCouponsIssued = 0;
  let registrationsWithTokens = 0;
  let pendingTokenRegistrations = 0;
  const byDate = {};
  const byHour = {};
  const byTwoHour = {};
  const byCouponCount = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    const coupons = Number(data.coupons || 0);
    totalCouponsBooked += coupons;

    if (data.tokensIssued === true) {
      totalPhysicalCouponsIssued += coupons;
      registrationsWithTokens += 1;
    } else {
      pendingTokenRegistrations += 1;
    }

    const day = dateKey(data.createdAt);
    if (!byDate[day]) {
      byDate[day] = {
        registrations: 0,
        coupons: 0,
        physicalCouponsIssued: 0,
      };
    }

    byDate[day].registrations += 1;
    byDate[day].coupons += coupons;

    if (data.tokensIssued === true) {
      byDate[day].physicalCouponsIssued += coupons;
    }

    const zoned = zonedHour(data.createdAt);
    if (zoned) {
      const hourlyKey = `${zoned.date}T${String(zoned.hour).padStart(2, "0")}:00`;
      addTrendBucket(byHour, hourlyKey, coupons);

      const twoHourStart = Math.floor(zoned.hour / 2) * 2;
      const twoHourlyKey = `${zoned.date}T${String(twoHourStart).padStart(2, "0")}:00`;
      addTrendBucket(byTwoHour, twoHourlyKey, coupons);
    }

    byCouponCount[coupons] = (byCouponCount[coupons] || 0) + 1;
  });

  const registrations = snapshot.size;

  const toTrendRows = (buckets) =>
    Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, values]) => ({ period, ...values }));

  return {
    registrations,
    totalCouponsBooked,
    totalPhysicalCouponsIssued,
    pendingPhysicalCouponRegistrations: pendingTokenRegistrations,
    registrationsWithTokens,
    averageCouponsPerRegistration: registrations
      ? Number((totalCouponsBooked / registrations).toFixed(2))
      : 0,
    byDate: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values })),
    bookingTrend: {
      daily: toTrendRows(byDate),
      hourly: toTrendRows(byHour),
      twoHourly: toTrendRows(byTwoHour),
    },
    byCouponCount: Object.entries(byCouponCount)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([coupons, count]) => ({ coupons: Number(coupons), count })),
  };
}

async function findRegistrationByMobile({
  db,
  mobile,
  accessKey,
  expectedKey,
}) {
  assertAdminKey(accessKey, expectedKey);
  const normalized = normalizeMobile(mobile);

  if (!/^[6-9]\d{9}$/.test(normalized)) {
    throw new Error("Invalid mobile number.");
  }

  const snapshot = await db
    .collection("registrations")
    .where("eventId", "==", "kshamawani-2026")
    .where("mobile", "==", normalized)
    .limit(1)
    .get();

  if (snapshot.empty) throw new Error("Registration not found.");

  return {
    registration: serializeRegistration(snapshot.docs[0].data()),
  };
}

async function deleteRegistration({
  db,
  registrationId,
  accessKey,
  expectedKey,
}) {
  assertAdminKey(accessKey, expectedKey);
  const code = String(registrationId || "").trim();

  if (!/^KW26-\d{4}$/.test(code)) {
    throw new Error("Invalid application code.");
  }

  let deleted;

  await db.runTransaction(async (transaction) => {
    const registrationRef = db.collection("registrations").doc(code);
    const registrationSnapshot = await transaction.get(registrationRef);

    if (!registrationSnapshot.exists) {
      throw new Error("Registration not found.");
    }

    const data = registrationSnapshot.data();
    if (data.tokensIssued === true) {
      throw new Error("Issued-token registrations cannot be deleted.");
    }

    const indexId =
      "kshamawaniMobile-" +
      crypto
        .createHash("sha256")
        .update("kshamawani-2026:" + data.mobile)
        .digest("hex");

    transaction.delete(registrationRef);
    transaction.delete(db.collection("registrationMobileIndex").doc(indexId));
    transaction.create(db.collection("adminDeletionAudit").doc(), {
      eventId: "kshamawani-2026",
      applicationCode: code,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: "ADMIN",
    });

    deleted = serializeRegistration(data);
  });

  return {
    deleted: {
      applicationCode: deleted.applicationCode,
      mobile: deleted.mobile,
    },
  };
}

module.exports = {
  assertAdminKey,
  coordinatorLookup,
  verifyAccess,
  dateKey,
  deleteRegistration,
  findRegistrationByMobile,
  getAdminStats,
  issueTokens,
  normalizeMobile,
};
