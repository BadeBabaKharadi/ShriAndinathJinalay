const crypto = require("node:crypto");

const EVENT_ID = "kshamawani-2026";
const MAX_COUPONS = 6;
const APPLICATION_PREFIX = "KW26-";
const MOBILE_INDEX_PREFIX = "kshamawaniMobile";

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function validateRegistration(data) {
  const eventId = normalizeText(data?.eventId);
  const mobile = normalizeMobile(data?.mobile);
  const name = normalizeText(data?.name);
  const address = normalizeText(data?.address);
  const coupons = Number(data?.coupons);

  if (eventId !== EVENT_ID) throw new Error("Invalid event.");
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw new Error("Invalid mobile number.");
  }
  if (!name) throw new Error("Name is required.");
  if (!address) throw new Error("Address is required.");
  if (
    !Number.isInteger(coupons) ||
    coupons < 1 ||
    coupons > MAX_COUPONS
  ) {
    throw new Error("Invalid coupon count.");
  }

  return {
    eventId,
    mobile,
    name,
    address,
    coupons,
    foodRequired: data?.foodRequired !== false,
    consentAccepted: data?.consentAccepted === true,
  };
}

function mobileIndexId(eventId, mobile) {
  return MOBILE_INDEX_PREFIX + "-" + sha256(eventId + ":" + mobile);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function applicationCode(number) {
  if (!Number.isInteger(number) || number < 1) {
    throw new Error("Invalid application number.");
  }
  return APPLICATION_PREFIX + String(number).padStart(4, "0");
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
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
    coupons: Number(data.coupons),
    tokensIssued: Boolean(data.tokensIssued),
    issuedAt: toDate(data.issuedAt)?.toISOString() || "",
    issuedBy: data.issuedBy || "",
  };
}

function assertEventOpen(eventData, now) {
  const opensAt = toDate(eventData.opensAt);
  const deadline = toDate(eventData.deadline);
  if (opensAt && now < opensAt) {
    throw new Error("Registration has not opened yet.");
  }
  if (deadline && now > deadline) {
    throw new Error("Registration is closed.");
  }
}

function eventRef(db, eventId) {
  return db.collection("events").doc(eventId);
}

function registrationRef(db, applicationCodeValue) {
  return db.collection("registrations").doc(applicationCodeValue);
}

function mobileRef(db, eventId, mobile) {
  return db
    .collection("registrationMobileIndex")
    .doc(mobileIndexId(eventId, mobile));
}

async function lookupRegistration({ db, eventId, mobile }) {
  const normalized = normalizeMobile(mobile);
  if (eventId !== EVENT_ID || !/^[6-9]\d{9}$/.test(normalized)) {
    throw new Error("Invalid mobile number.");
  }

  const indexSnapshot = await mobileRef(db, eventId, normalized).get();
  if (!indexSnapshot.exists) return { exists: false };

  const registrationId = indexSnapshot.data().registrationId;
  const registrationSnapshot = await registrationRef(
    db,
    registrationId,
  ).get();

  if (!registrationSnapshot.exists) {
    throw new Error("Registration index is inconsistent.");
  }

  return {
    exists: true,
    registration: serializeRegistration(registrationSnapshot.data()),
  };
}

async function createRegistration({ db, data, now = new Date() }) {
  const input = validateRegistration(data);
  if (!input.consentAccepted) throw new Error("Consent is required.");

  let created;

  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(
      eventRef(db, input.eventId),
    );
    const indexSnapshot = await transaction.get(
      mobileRef(db, input.eventId, input.mobile),
    );

    if (!eventSnapshot.exists) {
      throw new Error("Registration event is not configured.");
    }
    if (indexSnapshot.exists) {
      throw new Error("This mobile number is already registered.");
    }

    const eventData = eventSnapshot.data();
    assertEventOpen(eventData, now);

    const nextNumber = Number(eventData.nextApplicationNumber);
    if (!Number.isInteger(nextNumber) || nextNumber < 1) {
      throw new Error("Registration number counter is invalid.");
    }

    const code = applicationCode(nextNumber);
    const registration = {
      eventId: input.eventId,
      applicationCode: code,
      mobile: input.mobile,
      name: input.name,
      address: input.address,
      coupons: input.coupons,
      foodRequired: input.foodRequired,
      consentAccepted: input.consentAccepted,
      tokensIssued: false,
      issuedAt: null,
      issuedBy: "",
      createdAt: now,
      updatedAt: now,
    };

    transaction.create(registrationRef(db, code), registration);
    transaction.create(mobileRef(db, input.eventId, input.mobile), {
      eventId: input.eventId,
      registrationId: code,
      applicationCode: code,
      createdAt: now,
    });
    transaction.update(eventRef(db, input.eventId), {
      nextApplicationNumber: nextNumber + 1,
      updatedAt: now,
    });

    created = registration;
  });

  return {
    registrationId: created.applicationCode,
    applicationCode: created.applicationCode,
    registration: serializeRegistration(created),
  };
}

async function updateRegistration({ db, data, now = new Date() }) {
  const input = validateRegistration(data);
  if (!input.consentAccepted) throw new Error("Consent is required.");

  let updated;

  await db.runTransaction(async (transaction) => {
    const indexSnapshot = await transaction.get(
      mobileRef(db, input.eventId, input.mobile),
    );

    if (!indexSnapshot.exists) throw new Error("Registration not found.");

    const registrationId = indexSnapshot.data().registrationId;
    const registrationSnapshot = await transaction.get(
      registrationRef(db, registrationId),
    );

    if (!registrationSnapshot.exists) {
      throw new Error("Registration not found.");
    }

    const existing = registrationSnapshot.data();
    if (existing.eventId !== input.eventId) {
      throw new Error("Application does not belong to this event.");
    }
    if (
      data.registrationId &&
      String(data.registrationId).trim() !== existing.applicationCode
    ) {
      throw new Error("Application code does not match the mobile number.");
    }
    if (existing.tokensIssued === true) {
      throw new Error(
        "इस मोबाइल नंबर के लिए टोकन पहले ही जारी हो चुके हैं। अब पंजीकरण अपडेट नहीं किया जा सकता।",
      );
    }

    updated = {
      ...existing,
      name: input.name,
      address: input.address,
      coupons: input.coupons,
      foodRequired: input.foodRequired,
      consentAccepted: input.consentAccepted,
      updatedAt: now,
    };

    transaction.update(registrationRef(db, registrationId), {
      name: updated.name,
      address: updated.address,
      coupons: updated.coupons,
      foodRequired: updated.foodRequired,
      consentAccepted: updated.consentAccepted,
      updatedAt: now,
    });
  });

  return {
    registrationId: updated.applicationCode,
    applicationCode: updated.applicationCode,
    registration: serializeRegistration(updated),
  };
}

module.exports = {
  APPLICATION_PREFIX,
  EVENT_ID,
  MAX_COUPONS,
  applicationCode,
  createRegistration,
  lookupRegistration,
  mobileIndexId,
  normalizeMobile,
  serializeRegistration,
  updateRegistration,
  validateRegistration,
};
