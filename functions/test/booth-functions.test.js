const test = require("node:test");
const assert = require("node:assert/strict");
const {
  EVENT_ID,
  LIMIT,
  FEE,
  BoothValidationError,
  validMobile,
  validate,
} = require("../booth-domain.cjs");

const validInput = {
  name: "Test Applicant",
  stallName: "Test Stall",
  businessType: "Food",
  mobile: "9876543210",
  society: "Test Society",
  city: "Pune",
  state: "Maharashtra",
  receiptBase64: "c2FtcGxl",
  receiptMime: "image/png",
};

test("event configuration uses the agreed event, capacity, and fee", () => {
  assert.equal(EVENT_ID, "booth-2026-10-25");
  assert.equal(LIMIT, 20);
  assert.equal(FEE, 2100);
});

test("mobile validation rejects invalid numbers", () => {
  assert.equal(validMobile("9876543210"), true);
  assert.equal(validMobile("+91 98765 43210"), true);
  assert.equal(validMobile("123"), false);
  assert.equal(validMobile("0123456789"), false);
  assert.equal(validMobile("abcdefghij"), false);
});

test("valid input is normalized and retains required fields", () => {
  const result = validate({
    ...validInput,
    name: "  Test Applicant  ",
    mobile: "+91 98765 43210",
  });
  assert.equal(result.name, "Test Applicant");
  assert.equal(result.mobile, "9876543210");
  assert.deepEqual(
    Object.keys(result).sort(),
    [
      "businessType",
      "city",
      "mobile",
      "name",
      "society",
      "stallName",
      "state",
    ].sort(),
  );
});

test("every required registration field is enforced", () => {
  for (const field of [
    "name",
    "stallName",
    "businessType",
    "mobile",
    "society",
    "city",
    "state",
  ]) {
    assert.throws(
      () => validate({ ...validInput, [field]: "  " }),
      (error) =>
        error instanceof BoothValidationError && error.message.includes(field),
    );
  }
});

test("receipt validation accepts only supported image types", () => {
  assert.throws(
    () => validate({ ...validInput, receiptBase64: "" }),
    /Upload a valid payment receipt/,
  );

  for (const mime of ["application/pdf", "image/gif", "text/plain"]) {
    assert.throws(
      () => validate({ ...validInput, receiptMime: mime }),
      /Upload a valid payment receipt/,
    );
  }

  assert.equal(
    validate({ ...validInput, receiptMime: "image/webp" }).state,
    "Maharashtra",
  );
});

test("oversized receipt payloads are rejected", () => {
  assert.throws(
    () => validate({ ...validInput, receiptBase64: "x".repeat(1900001) }),
    /too large/,
  );
});
