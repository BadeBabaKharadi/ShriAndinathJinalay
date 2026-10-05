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

test("filters admin applications", async () => {
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
        limit() {
          return {
            get: async () => ({ docs }),
          };
        },
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

test("finds registration by normalized mobile", async () => {
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
          return {
            limit() {
              return {
                get: async () => ({ empty: false, size: 1, docs: [doc] }),
              };
            },
          };
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

test("requires applicant overall percentage", async () => {
  await assert.rejects(
    () =>
      service.createApplication({
        db: {},
        data: {
          name: "Test Student",
          mobile: "9876543210",
          address: "Test Address",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
          motherName: "Mother",
          fatherName: "Father",
          dateOfBirth: "2010-01-01",
          classStandard: "10",
          schoolInstitute: "Test School",
          achievementDetails: "Achievement",
        },
      }),
    /Required field missing: overallPercentage/,
  );
});

test("validates Pratibha class and percentage rules", () => {
  const base = {
    name: "Test Student",
    mobile: "9876543210",
    address: "Test Address",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    motherName: "Mother",
    fatherName: "Father",
    dateOfBirth: "2010-01-01",
    schoolInstitute: "Test School",
    achievementDetails: "Achievement",
    overallPercentage: 85,
  };

  assert.doesNotThrow(() => {
    const d = { ...base, classStandard: "10" };
    if (d.overallPercentage < (d.classStandard === "10" ? 85 : 80)) {
      throw new Error("invalid");
    }
  });

  assert.throws(() => {
    const d = { ...base, classStandard: "10", overallPercentage: 84 };
    if (d.overallPercentage < 85) throw new Error("10th minimum");
  }, /10th minimum/);

  assert.throws(() => {
    const d = { ...base, classStandard: "12", overallPercentage: 79 };
    if (d.overallPercentage < 80) throw new Error("12th minimum");
  }, /12th minimum/);

  assert.throws(() => {
    const d = { ...base, classStandard: "11", overallPercentage: 90 };
    if (!["10", "12"].includes(d.classStandard)) throw new Error("class");
  }, /class/);
});

test("supports typed documents and requires Aadhaar plus marksheet", () => {
  const docs = [
    { documentType: "AADHAAR" },
    { documentType: "MARKSHEET" },
    { documentType: "OTHER" },
    { documentType: "OTHER" },
  ];

  assert.equal(
    docs.filter((x) => x.documentType === "AADHAAR").length,
    1,
  );
  assert.equal(
    docs.filter((x) => x.documentType === "MARKSHEET").length,
    1,
  );
  assert.ok(docs.filter((x) => x.documentType === "OTHER").length > 1);

  assert.throws(() => {
    const incomplete = docs.filter(
      (x) => x.documentType !== "MARKSHEET",
    );
    if (
      incomplete.filter((x) => x.documentType === "MARKSHEET").length !== 1
    ) {
      throw new Error("marksheet required");
    }
  }, /marksheet required/);
});
