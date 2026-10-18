const test = require("node:test");
const { Buffer } = require("node:buffer");
const assert = require("node:assert/strict");
const {
  normalizeMobile,
  validateFood,
  validateStay,
  registrationCode,
} = require("../event-registration.cjs");

test("normalizes valid Indian mobile numbers and rejects invalid values", () => {
  assert.equal(normalizeMobile("+91 98765 43210"), "9876543210");
  assert.throws(() => normalizeMobile("123"), /valid 10-digit/);
});

test("food registration requires name/address and enforces coupon cap of seven", () => {
  assert.equal(
    validateFood({
      mobile: "9876543210",
      name: "Test Person",
      address: "Pune",
      coupons: 7,
    }).coupons,
    7,
  );
  assert.throws(
    () =>
      validateFood({
        mobile: "9876543210",
        name: "Test",
        address: "Pune",
        coupons: 8,
      }),
    /between 0 and 7/,
  );
  assert.throws(
    () =>
      validateFood({
        mobile: "9876543210",
        name: "Test",
        address: "Pune",
        coupons: 0,
      }),
    /between 1 and 7/,
  );
});

test("lodging validates group counts, check-in date/time, and mandatory private document", () => {
  const valid = {
    mobile: "9876543210",
    name: "Test Traveller",
    address: "Pune address",
    comingFrom: "Nashik",
    male: 1,
    female: 1,
    children: 0,
    checkInDate: "2026-10-25",
    checkInTime: "12:30",
    checkOutDate: "2026-10-26",
    checkOutTime: "10:00",
    aadhaarMime: "application/pdf",
    aadhaarFileName: "id.pdf",
    aadhaarBase64: Buffer.from("%PDF-1.7 sample pdf").toString("base64"),
  };
  assert.equal(validateStay(valid).male, 1);
  assert.throws(() => validateStay({ ...valid, male: -1 }), /whole number/);
  assert.throws(
    () => validateStay({ ...valid, male: 0, female: 0, children: 0 }),
    /At least one traveller/,
  );
  assert.throws(
    () => validateStay({ ...valid, checkInDate: "2026-10-27" }),
    /Check-in date/,
  );
  assert.throws(
    () => validateStay({ ...valid, aadhaarMime: "text/plain" }),
    /PDF, JPG, or PNG/,
  );
  assert.throws(
    () => validateStay({ ...valid, aadhaarBase64: "" }),
    /Aadhaar file/,
  );
});

test("registration reference is stable per mobile and form type", () => {
  assert.equal(
    registrationCode("food", "9876543210"),
    registrationCode("food", "9876543210"),
  );
  assert.notEqual(
    registrationCode("food", "9876543210"),
    registrationCode("stay", "9876543210"),
  );
});

function createFakeDb() {
  const collections = new Map();
  return {
    collections,
    collection(name) {
      if (!collections.has(name)) collections.set(name, new Map());
      const records = collections.get(name);
      return {
        doc(id) {
          return {
            async get() {
              const data = records.get(id);
              return { exists: Boolean(data), data: () => data };
            },
            async set(data) {
              records.set(id, data);
            },
          };
        },
        orderBy() {
          return {
            limit() {
              return {
                async get() {
                  const docs = [...records.entries()].map(([id, data]) => ({
                    id,
                    data: () => data,
                  }));
                  return { docs };
                },
              };
            },
          };
        },
      };
    },
  };
}

function createFakeStorage() {
  const saved = [];
  return {
    saved,
    bucket() {
      return {
        file(path) {
          return {
            async save(bytes, options) {
              saved.push({ path, bytes, options });
            },
            async getSignedUrl() {
              return [`https://private.example/${path}?signed=1`];
            },
          };
        },
      };
    },
  };
}

const validStayInput = (overrides = {}) => ({
  mobile: "9876543210",
  name: "Test Traveller",
  address: "Pune address",
  comingFrom: "Nashik",
  male: 1,
  female: 1,
  children: 0,
  checkInDate: "2026-10-25",
  checkInTime: "12:30",
  checkOutDate: "2026-10-26",
  checkOutTime: "10:00",
  aadhaarMime: "application/pdf",
  aadhaarFileName: "id.pdf",
  aadhaarBase64: Buffer.from("%PDF-1.7 sample pdf").toString("base64"),
  ...overrides,
});

test("food save, duplicate-mobile update, and lookup persist one record", async () => {
  const {
    saveRegistration,
    lookupRegistration,
    FOOD,
  } = require("../event-registration.cjs");
  const db = createFakeDb();
  const first = await saveRegistration({
    db,
    kind: "food",
    input: {
      mobile: "9876543210",
      name: "First Name",
      address: "Pune",
      coupons: 2,
    },
    storage: createFakeStorage(),
  });
  const second = await saveRegistration({
    db,
    kind: "food",
    input: {
      mobile: "+91 98765 43210",
      name: "Updated Name",
      address: "Mumbai",
      coupons: 7,
    },
    storage: createFakeStorage(),
  });
  const found = await lookupRegistration({
    db,
    kind: "food",
    mobile: "9876543210",
  });
  assert.equal(first.exists, false);
  assert.equal(second.exists, true);
  assert.equal(found.exists, true);
  assert.equal(found.registration.name, "Updated Name");
  assert.equal(found.registration.coupons, 7);
  assert.equal(db.collections.get(FOOD).size, 1);
  assert.equal(
    found.registration.registrationId,
    first.registration.registrationId,
  );
});

test("allows lodging check-in from 23 October 2026", () => {
  const { validateStay } = require("../event-registration.cjs");
  const input = validStayInput({
    checkInDate: "2026-10-23",
    checkInTime: "12:00",
    checkOutDate: "2026-10-24",
    checkOutTime: "10:00",
  });
  assert.equal(validateStay(input).checkInDate, "2026-10-23");
});

test("lodging identity documents are validated and normalized", () => {
  const valid = validStayInput({
    identityDocumentType: "aadhaar",
    identityDocumentNumber: "234567890123",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
  });
  const { validateStay } = require("../event-registration.cjs");
  const normalized = validateStay(valid);
  assert.equal(normalized.identityDocumentType, "aadhaar");
  assert.equal(normalized.identityDocumentNumber, "234567890123");
  assert.equal(normalized.city, "Pune");
  assert.equal(normalized.state, "Maharashtra");
  assert.equal(normalized.pincode, "411014");

  assert.equal(
    validateStay({
      ...valid,
      identityDocumentType: "pan",
      identityDocumentNumber: "abcde1234f",
    }).identityDocumentNumber,
    "ABCDE1234F",
  );
  assert.throws(() => validateStay({ ...valid, pincode: "41101" }), /PIN code/);
  assert.throws(
    () => validateStay({ ...valid, identityDocumentNumber: "012345678901" }),
    /Aadhaar number/,
  );
  assert.throws(
    () =>
      validateStay({
        ...valid,
        identityDocumentType: "pan",
        identityDocumentNumber: "INVALID",
      }),
    /PAN number/,
  );
  assert.throws(
    () =>
      validateStay({
        ...valid,
        identityDocumentType: "voter_id",
        identityDocumentNumber: "ABC123",
      }),
    /Voter ID/,
  );
  assert.throws(
    () => validateStay({ ...valid, identityDocumentType: "other" }),
    /identity document type/,
  );
});

test("lodging edits preserve existing Aadhaar without another upload", async () => {
  const {
    saveRegistration,
    lookupRegistration,
    STAY,
  } = require("../event-registration.cjs");
  const db = createFakeDb();
  const storage = createFakeStorage();
  await saveRegistration({
    db,
    kind: "stay",
    input: validStayInput(),
    storage,
  });
  assert.equal(storage.saved.length, 1);

  const updated = await saveRegistration({
    db,
    kind: "stay",
    input: validStayInput({
      name: "Updated Traveller",
      aadhaarBase64: "",
      aadhaarMime: "",
      aadhaarFileName: "",
    }),
    storage,
  });
  const found = await lookupRegistration({
    db,
    kind: "stay",
    mobile: "9876543210",
  });
  assert.equal(updated.exists, true);
  assert.equal(storage.saved.length, 1);
  assert.equal(found.registration.name, "Updated Traveller");
  assert.equal(found.registration.aadhaarUploaded, true);
  assert.equal(db.collections.get(STAY).size, 1);
});

test("invalid registration type is rejected by save", async () => {
  const { saveRegistration } = require("../event-registration.cjs");
  await assert.rejects(
    saveRegistration({
      db: createFakeDb(),
      kind: "other",
      input: { mobile: "9876543210" },
      storage: createFakeStorage(),
    }),
    /Invalid registration type/,
  );
});

test("admin listing and Aadhaar URL require the expected key", async () => {
  const { adminList, adminAadhaarUrl } = require("../event-registration.cjs");
  const db = createFakeDb();
  await assert.rejects(
    adminList({
      db,
      kind: "stay",
      accessKey: "wrong",
      expectedKey: "secret",
    }),
    /Unauthorized/,
  );
  await assert.rejects(
    adminAadhaarUrl({
      db,
      mobile: "9876543210",
      accessKey: "wrong",
      expectedKey: "secret",
      storage: createFakeStorage(),
    }),
    /Unauthorized/,
  );
});

test("Aadhaar MIME type must match the actual file signature", () => {
  const input = validStayInput();
  assert.throws(
    () =>
      validateStay({
        ...input,
        aadhaarBase64: Buffer.from("not a PDF").toString("base64"),
      }),
    /content does not match/,
  );
});

test("authorized admin can list registrations and obtain a short-lived Aadhaar URL", async () => {
  const {
    saveRegistration,
    adminList,
    adminAadhaarUrl,
  } = require("../event-registration.cjs");
  const db = createFakeDb();
  const storage = createFakeStorage();
  await saveRegistration({
    db,
    kind: "stay",
    input: validStayInput(),
    storage,
  });

  const listing = await adminList({
    db,
    kind: "stay",
    accessKey: "secret",
    expectedKey: "secret",
  });
  const access = await adminAadhaarUrl({
    db,
    mobile: "9876543210",
    accessKey: "secret",
    expectedKey: "secret",
    storage,
  });
  assert.equal(listing.summary.registrations, 1);
  assert.equal(listing.summary.male, 1);
  assert.equal(listing.registrations[0].aadhaarAvailable, true);
  assert.match(access.url, /^https:\/\/private\.example\//);
  assert.equal(access.expiresInSeconds, 300);
});

test("Aadhaar uploads larger than 5 MB are rejected", () => {
  const input = validStayInput({
    aadhaarBase64: Buffer.alloc(5 * 1024 * 1024 + 1, 0x41).toString("base64"),
  });
  assert.throws(() => validateStay(input), /smaller than 5 MB/);
});
