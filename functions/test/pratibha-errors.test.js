const test = require("node:test");
const assert = require("node:assert/strict");
const { mapPublicError } = require("../pratibha-errors.cjs");

test("maps known validation errors to public invalid-argument errors", () => {
  const error = mapPublicError(new Error("Invalid mobile number."));
  assert.equal(error.code, "invalid-argument");
  assert.equal(error.message, "Invalid mobile number.");
});

test("maps expected registration errors without exposing internals", () => {
  const error = mapPublicError(
    new Error(
      "A registration already exists for this mobile number. Please search the existing registration and edit it.",
    ),
  );
  assert.equal(error.code, "invalid-argument");
});

test("does not expose IAM or storage implementation errors", () => {
  const error = mapPublicError(
    new Error(
      "'iam.serviceAccounts.signBlob' denied on resource (or it may not exist).",
    ),
  );
  assert.equal(error, null);
});

test("does not expose arbitrary backend errors", () => {
  const error = mapPublicError(
    new Error("Firestore INTERNAL: failed to read document"),
  );
  assert.equal(error, null);
});
