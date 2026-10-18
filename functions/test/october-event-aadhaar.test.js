const test = require("node:test");
const assert = require("node:assert/strict");
const { Buffer } = require("node:buffer");
const { saveRegistration, STAY } = require("../event-registration.cjs");

function fakeDb() {
  const records = new Map();
  return {
    records,
    collection(name) {
      assert.equal(name, STAY);
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
      };
    },
  };
}

function fakeStorage() {
  const objects = new Map();
  const deleted = [];
  return {
    objects,
    deleted,
    bucket() {
      return {
        file(path) {
          return {
            async save(bytes) {
              objects.set(path, Buffer.from(bytes));
            },
            async delete() {
              deleted.push(path);
              objects.delete(path);
            },
          };
        },
      };
    },
  };
}

const baseInput = {
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
};

test("editing a lodging registration can remove the existing private Aadhaar", async () => {
  const db = fakeDb();
  const storage = fakeStorage();
  const uploaded = await saveRegistration({
    db,
    kind: "stay",
    input: {
      ...baseInput,
      aadhaarMime: "application/pdf",
      aadhaarFileName: "aadhaar.pdf",
      aadhaarBase64: Buffer.from("%PDF-1.7 test document").toString("base64"),
    },
    storage,
  });
  const savedBefore = db.records.get("9876543210");
  const oldPath = savedBefore.aadhaarPath;
  assert.ok(oldPath);
  assert.equal(storage.objects.has(oldPath), true);

  const result = await saveRegistration({
    db,
    kind: "stay",
    input: { ...baseInput, removeAadhaar: true },
    storage,
  });
  const savedAfter = db.records.get("9876543210");
  assert.equal(uploaded.exists, false);
  assert.equal(result.exists, true);
  assert.equal(result.registration.aadhaarUploaded, false);
  assert.equal(Object.hasOwn(savedAfter, "aadhaarPath"), false);
  assert.deepEqual(storage.deleted, [oldPath]);
  assert.equal(storage.objects.has(oldPath), false);
});
