const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applicationCode,
  createRegistration,
  mobileIndexId,
  normalizeMobile,
  serializeRegistration,
  updateRegistration,
  validateRegistration,
} = require("../registration");

class FakeSnapshot {
  constructor(value) {
    this.value = value;
    this.exists = value !== undefined;
  }

  data() {
    return this.value;
  }
}

class FakeReference {
  constructor(db, collection, id) {
    this.db = db;
    this.collection = collection;
    this.id = id;
  }

  async get() {
    return new FakeSnapshot(
      this.db.data.get(this.collection + "/" + this.id),
    );
  }
}

class FakeTransaction {
  constructor(db) {
    this.db = db;
  }

  async get(reference) {
    return reference.get();
  }

  create(reference, value) {
    const key = reference.collection + "/" + reference.id;
    if (this.db.data.has(key)) throw new Error("Already exists.");
    this.db.data.set(key, value);
  }

  update(reference, value) {
    const key = reference.collection + "/" + reference.id;
    if (!this.db.data.has(key)) throw new Error("Missing document.");
    this.db.data.set(key, {
      ...this.db.data.get(key),
      ...value,
    });
  }
}

class FakeDb {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
  }

  collection(name) {
    return {
      doc: (id) => new FakeReference(this, name, id),
    };
  }

  async runTransaction(callback) {
    return callback(new FakeTransaction(this));
  }
}

function openEvent(nextApplicationNumber = 11) {
  return {
    eventId: "kshamawani-2026",
    opensAt: new Date("2026-09-25T15:00:00+05:30"),
    deadline: new Date("2026-09-27T23:59:59+05:30"),
    nextApplicationNumber,
  };
}

test("normalizes valid registration input", () => {
  const result = validateRegistration({
    eventId: "kshamawani-2026",
    mobile: " 98606-99870 ",
    name: " Arpit Jain ",
    address: "D-501, Satin Brick Society",
    coupons: "6",
    foodRequired: true,
    consentAccepted: true,
  });

  assert.deepEqual(result, {
    eventId: "kshamawani-2026",
    mobile: "9860699870",
    name: "Arpit Jain",
    address: "D-501, Satin Brick Society",
    coupons: 6,
    foodRequired: true,
    consentAccepted: true,
  });
});

test("rejects invalid coupon counts", () => {
  assert.throws(
    () =>
      validateRegistration({
        eventId: "kshamawani-2026",
        mobile: "9860699870",
        name: "Arpit Jain",
        address: "D-501",
        coupons: 7,
        consentAccepted: true,
      }),
    /Invalid coupon count/,
  );
});

test("rejects an invalid mobile number", () => {
  assert.throws(
    () =>
      validateRegistration({
        eventId: "kshamawani-2026",
        mobile: "12345",
        name: "Arpit Jain",
        address: "D-501",
        coupons: 2,
        consentAccepted: true,
      }),
    /Invalid mobile number/,
  );
});

test("application numbers remain stable and zero-padded", () => {
  assert.equal(applicationCode(1), "KW26-0001");
  assert.equal(applicationCode(10), "KW26-0010");
  assert.equal(applicationCode(101), "KW26-0101");
});

test("mobile indexes are deterministic without exposing the mobile number", () => {
  const id = mobileIndexId("kshamawani-2026", normalizeMobile("9860699870"));

  assert.match(id, /^kshamawaniMobile-[a-f0-9]{64}$/);
  assert.doesNotMatch(id, /9860699870/);
});

test("creates a registration and advances the application counter atomically", async () => {
  const db = new FakeDb({
    "events/kshamawani-2026": openEvent(),
  });
  const now = new Date("2026-09-25T16:01:00+05:30");

  const result = await createRegistration({
    db,
    now,
    data: {
      eventId: "kshamawani-2026",
      mobile: "8511278527",
      name: "Pratik Jain",
      address: "C 403 Dreams Veeroday",
      coupons: 4,
      foodRequired: true,
      consentAccepted: true,
    },
  });

  assert.equal(result.applicationCode, "KW26-0011");
  assert.equal(
    db.data.get("events/kshamawani-2026").nextApplicationNumber,
    12,
  );
  assert.equal(
    db.data.get("registrationMobileIndex/" + mobileIndexId(
      "kshamawani-2026",
      "8511278527",
    )).registrationId,
    "KW26-0011",
  );
});

test("rejects a duplicate mobile before creating another registration", async () => {
  const mobile = "8511278527";
  const indexId = mobileIndexId("kshamawani-2026", mobile);
  const db = new FakeDb({
    "events/kshamawani-2026": openEvent(),
    ["registrationMobileIndex/" + indexId]: {
      registrationId: "KW26-0011",
      applicationCode: "KW26-0011",
    },
  });

  await assert.rejects(
    createRegistration({
      db,
      now: new Date("2026-09-25T16:01:00+05:30"),
      data: {
        eventId: "kshamawani-2026",
        mobile,
        name: "Duplicate Person",
        address: "C 403 Dreams Veeroday",
        coupons: 2,
        consentAccepted: true,
      },
    }),
    /already registered/,
  );
});

test("rejects updates after tokens have been issued", async () => {
  const mobile = "8511278527";
  const indexId = mobileIndexId("kshamawani-2026", mobile);
  const db = new FakeDb({
    "events/kshamawani-2026": openEvent(),
    ["registrationMobileIndex/" + indexId]: {
      registrationId: "KW26-0011",
      applicationCode: "KW26-0011",
    },
    "registrations/KW26-0011": {
      eventId: "kshamawani-2026",
      applicationCode: "KW26-0011",
      mobile,
      name: "Pratik Jain",
      address: "C 403 Dreams Veeroday",
      coupons: 4,
      tokensIssued: true,
      issuedAt: new Date("2026-09-25T16:05:00+05:30"),
      issuedBy: "COORDINATOR",
    },
  });

  await assert.rejects(
    updateRegistration({
      db,
      now: new Date("2026-09-25T16:10:00+05:30"),
      data: {
        eventId: "kshamawani-2026",
        registrationId: "KW26-0011",
        mobile,
        name: "Pratik Jain",
        address: "New Address",
        coupons: 5,
        consentAccepted: true,
      },
    }),
    /टोकन पहले ही जारी/,
  );
});

test("serializes a registration for the public API", () => {
  const result = serializeRegistration({
    eventId: "kshamawani-2026",
    applicationCode: "KW26-0001",
    mobile: "9860699870",
    name: "Arpit Jain",
    address: "D-501",
    coupons: 6,
    tokensIssued: false,
    issuedAt: null,
    issuedBy: "",
  });

  assert.deepEqual(result, {
    eventId: "kshamawani-2026",
    registrationId: "KW26-0001",
    applicationCode: "KW26-0001",
    mobile: "9860699870",
    name: "Arpit Jain",
    address: "D-501",
    coupons: 6,
    tokensIssued: false,
    issuedAt: "",
    issuedBy: "",
  });
});
