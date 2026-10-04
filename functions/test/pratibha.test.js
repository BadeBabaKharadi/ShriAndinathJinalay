const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("../pratibha.cjs");

test("rejects unauthorized admin access", async () => {
  await assert.rejects(
    () =>
      service.adminConfig({
        db: {},
        accessKey: "bad",
        expectedKey: "good",
      }),
    /Unauthorized/,
  );
});

test("validates admin review percentage", async () => {
  const db = {
    collection() {
      return {
        doc() {
          return { update: async () => {} };
        },
      };
    },
  };

  await assert.rejects(
    () =>
      service.review({
        db,
        accessKey: "ok",
        expectedKey: "ok",
        applicationId: "PS26-00001",
        status: "UNDER_REVIEW",
        overallPercentage: 101,
      }),
    /Percentage must be between 0 and 100/,
  );
});

test("sorts and filters admin applications without a composite Firestore query", async () => {
  const docs = [
    {
      data: () => ({
        applicationId: "PS26-00002",
        name: "B",
        mobile: "9000000002",
        city: "Pune",
        schoolInstitute: "X",
        status: "SUBMITTED",
        createdAt: new Date("2026-10-02"),
      }),
    },
    {
      data: () => ({
        applicationId: "PS26-00001",
        name: "A",
        mobile: "9000000001",
        city: "Pune",
        schoolInstitute: "Y",
        status: "CONSIDERED_FOR_SAMMAN",
        createdAt: new Date("2026-10-01"),
      }),
    },
  ];

  const db = {
    collection() {
      return {
        limit: async () => ({ docs }),
      };
    },
  };

  const result = await service.adminList({
    db,
    accessKey: "ok",
    expectedKey: "ok",
    status: "SUBMITTED",
    filter: "B",
  });

  assert.equal(result.total, 1);
  assert.equal(result.records[0].applicationId, "PS26-00002");
});

test("finds an existing registration by normalized mobile number", async () => {
  const doc = {
    data: () => ({
      applicationId: "PS26-00009",
      name: "Test Student",
      mobile: "9876543210",
      city: "Pune",
      schoolInstitute: "Test School",
      status: "SUBMITTED",
      createdAt: new Date("2026-10-03"),
    }),
    ref: { update: async () => {} },
  };
  const db = {
    collection() {
      return {
        where() {
          return { limit: async () => ({ empty: false, size: 1, docs: [doc] }) };
        },
      };
    },
  };
  const result = await service.findApplicationByMobile({
    db,
    mobileNumber: "+91 98765 43210",
  });
  assert.equal(result.found, true);
  assert.equal(result.application.applicationId, "PS26-00009");
  assert.equal(result.application.name, "Test Student");
  assert.equal(typeof result.accessToken, "string");
});
