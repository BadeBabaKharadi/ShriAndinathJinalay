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
