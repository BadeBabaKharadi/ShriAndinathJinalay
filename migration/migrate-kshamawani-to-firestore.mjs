import crypto from "node:crypto";
import process from "node:process";
import { readFile } from "node:fs/promises";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as XLSX from "xlsx";

const EVENT_ID = "kshamawani-2026";
const MAX_COUPONS = 6;
const EVENT_OPENS_AT = "2026-09-25T16:00:00+05:30";
const EVENT_DEADLINE = "2026-09-27T23:59:59+05:30";
const REQUIRED_HEADERS = [
  "Timestamp",
  "EventId",
  "ApplicationCode",
  "Mobile",
  "Name",
  "Address",
  "Coupons",
  "TokensIssued",
  "IssuedAt",
  "IssuedBy",
];

function normalizeMobile(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toDate(value, fieldName) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid " + fieldName + ".");
  }
  return date;
}

function mobileIndexId(mobile) {
  return (
    "kshamawaniMobile-" +
    crypto
      .createHash("sha256")
      .update(EVENT_ID + ":" + mobile)
      .digest("hex")
  );
}

function parseRows(workbook) {
  const sheet = workbook.Sheets["Kshamawani Registrations"];
  if (!sheet) {
    throw new Error('Sheet "Kshamawani Registrations" was not found.');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
  const headers = rows.shift().map((value) => String(value).trim());

  if (JSON.stringify(headers) !== JSON.stringify(REQUIRED_HEADERS)) {
    throw new Error("Unexpected Kshamawani Registrations headers.");
  }

  const registrations = rows
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row, index) => {
      const rowNumber = index + 2;
      const eventId = normalizeText(row[1]);
      const applicationCode = normalizeText(row[2]).toUpperCase();
      const mobile = normalizeMobile(row[3]);
      const name = normalizeText(row[4]);
      const address = normalizeText(row[5]);
      const coupons = Number(row[6]);
      const tokensIssued = normalizeText(row[7]).toUpperCase() === "YES";
      const timestamp = toDate(row[0], "Timestamp at row " + rowNumber);
      const issuedAt = normalizeText(row[8])
        ? toDate(row[8], "IssuedAt at row " + rowNumber)
        : null;
      const issuedBy = normalizeText(row[9]);

      if (eventId !== EVENT_ID) {
        throw new Error("Unexpected event at row " + rowNumber + ".");
      }
      if (!/^KW26-\d{4}$/.test(applicationCode)) {
        throw new Error("Invalid application code at row " + rowNumber + ".");
      }
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        throw new Error("Invalid mobile at row " + rowNumber + ".");
      }
      if (!name || !address) {
        throw new Error("Name/address missing at row " + rowNumber + ".");
      }
      if (!Number.isInteger(coupons) || coupons < 1 || coupons > MAX_COUPONS) {
        throw new Error("Invalid coupon count at row " + rowNumber + ".");
      }

      return {
        eventId,
        applicationCode,
        mobile,
        name,
        address,
        coupons,
        tokensIssued,
        issuedAt,
        issuedBy,
        createdAt: timestamp,
        updatedAt: timestamp,
        foodRequired: true,
        consentAccepted: true,
      };
    });

  const mobiles = new Set();
  const codes = new Set();
  for (const registration of registrations) {
    if (mobiles.has(registration.mobile)) {
      throw new Error("Duplicate mobile in source: " + registration.mobile);
    }
    if (codes.has(registration.applicationCode)) {
      throw new Error(
        "Duplicate application code in source: " +
          registration.applicationCode,
      );
    }
    mobiles.add(registration.mobile);
    codes.add(registration.applicationCode);
  }

  return registrations;
}

function asFirestoreRegistration(registration) {
  return {
    ...registration,
    createdAt: Timestamp.fromDate(registration.createdAt),
    updatedAt: Timestamp.fromDate(registration.updatedAt),
    issuedAt: registration.issuedAt
      ? Timestamp.fromDate(registration.issuedAt)
      : null,
  };
}

function comparableRegistration(value) {
  return JSON.stringify({
    ...value,
    createdAt: value.createdAt?.toDate?.().toISOString(),
    updatedAt: value.updatedAt?.toDate?.().toISOString(),
    issuedAt: value.issuedAt?.toDate?.().toISOString() || null,
  });
}

async function migrate(filePath) {
  const workbook = XLSX.read(await readFile(filePath), {
    type: "buffer",
    cellDates: true,
  });
  const registrations = parseRows(workbook);
  const db = getFirestore();

  const eventRef = db.collection("events").doc(EVENT_ID);
  const registrationRefs = registrations.map((item) =>
    db.collection("registrations").doc(item.applicationCode),
  );
  const mobileRefs = registrations.map((item) =>
    db.collection("registrationMobileIndex").doc(mobileIndexId(item.mobile)),
  );

  const existingSnapshots = await db.getAll(
    eventRef,
    ...registrationRefs,
    ...mobileRefs,
  );
  const eventSnapshot = existingSnapshots.shift();

  const existingRegistrations = new Map();
  for (let i = 0; i < registrations.length; i += 1) {
    existingRegistrations.set(
      registrations[i].applicationCode,
      existingSnapshots[i],
    );
  }

  const existingIndexes = new Map();
  const indexOffset = registrations.length;
  for (let i = 0; i < registrations.length; i += 1) {
    existingIndexes.set(
      registrations[i].mobile,
      existingSnapshots[indexOffset + i],
    );
  }

  let imported = 0;
  let skipped = 0;
  let batch = db.batch();

  for (const registration of registrations) {
    const existing = existingRegistrations.get(
      registration.applicationCode,
    );
    const expected = asFirestoreRegistration(registration);

    if (existing?.exists) {
      if (
        comparableRegistration(existing.data()) !==
        comparableRegistration(expected)
      ) {
        throw new Error(
          "Existing registration " +
            registration.applicationCode +
            " does not match the source.",
        );
      }
      skipped += 1;
    } else {
      batch.create(
        db.collection("registrations").doc(registration.applicationCode),
        expected,
      );
      imported += 1;
    }

    const index = existingIndexes.get(registration.mobile);
    const expectedIndex = {
      eventId: EVENT_ID,
      registrationId: registration.applicationCode,
      applicationCode: registration.applicationCode,
      createdAt: expected.createdAt,
    };

    if (index?.exists) {
      const currentIndex = index.data();
      if (
        currentIndex.eventId !== expectedIndex.eventId ||
        currentIndex.registrationId !== expectedIndex.registrationId ||
        currentIndex.applicationCode !== expectedIndex.applicationCode
      ) {
        throw new Error(
          "Existing mobile index for " +
            registration.applicationCode +
            " does not match the source.",
        );
      }
    } else {
      batch.create(
        db
          .collection("registrationMobileIndex")
          .doc(mobileIndexId(registration.mobile)),
        expectedIndex,
      );
    }
  }

  const maxApplicationNumber = Math.max(
    ...registrations.map((item) =>
      Number(item.applicationCode.replace("KW26-", "")),
    ),
  );
  const existingNextNumber = eventSnapshot?.exists
    ? Number(eventSnapshot.data().nextApplicationNumber)
    : 1;

  const nextApplicationNumber = Math.max(
    Number.isInteger(existingNextNumber) ? existingNextNumber : 1,
    maxApplicationNumber + 1,
  );

  const eventData = {
    eventId: EVENT_ID,
    name: "क्षमावाणी २०२६",
    date: "2026-09-27",
    venueName:
      "1008 श्री आदिनाथ दिगंबर जैन मंदिर, ड्रीम्स वीरोदय सोसाइटी",
    venuePlace: "खराड़ी, पुणे",
    opensAt: Timestamp.fromDate(new Date(EVENT_OPENS_AT)),
    deadline: Timestamp.fromDate(new Date(EVENT_DEADLINE)),
    maxCoupons: MAX_COUPONS,
    nextApplicationNumber,
    updatedAt: Timestamp.now(),
  };

  if (!eventSnapshot?.exists) {
    batch.create(eventRef, eventData);
  } else if (
    !Number.isInteger(existingNextNumber) ||
    existingNextNumber < maxApplicationNumber + 1
  ) {
    batch.update(eventRef, {
      nextApplicationNumber: maxApplicationNumber + 1,
      updatedAt: eventData.updatedAt,
    });
  }

  await batch.commit();

  return {
    sourceRows: registrations.length,
    imported,
    skipped,
    nextApplicationNumber,
  };
}

const filePath = process.argv[2];
if (!filePath) {
  throw new Error(
    "Usage: npm run migrate -- <path-to-Kshamawani.xlsx>",
  );
}

initializeApp({ credential: applicationDefault() });
const result = await migrate(filePath);
console.log(JSON.stringify(result, null, 2));
