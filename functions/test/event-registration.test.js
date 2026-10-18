const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeMobile, validateFood, validateStay, registrationCode } = require("../event-registration.cjs");

test("normalizes valid Indian mobile numbers and rejects invalid values", () => {
  assert.equal(normalizeMobile("+91 98765 43210"), "9876543210");
  assert.throws(() => normalizeMobile("123"), /valid 10-digit/);
});
test("food registration requires name/address and enforces coupon cap of seven", () => {
  assert.equal(validateFood({ mobile: "9876543210", name: "Test Person", address: "Pune", coupons: 7 }).coupons, 7);
  assert.throws(() => validateFood({ mobile: "9876543210", name: "Test", address: "Pune", coupons: 8 }), /between 0 and 7/);
  assert.throws(() => validateFood({ mobile: "9876543210", name: "Test", address: "Pune", coupons: 0 }), /between 1 and 7/);
});
test("lodging validates group counts, check-in date/time, and mandatory private document", () => {
  const valid = { mobile: "9876543210", name: "Test Traveller", address: "Pune address", comingFrom: "Nashik", male: 1, female: 1, children: 0, checkInDate: "2026-10-25", checkInTime: "12:30", aadhaarMime: "application/pdf", aadhaarFileName: "id.pdf", aadhaarBase64: Buffer.from("sample pdf").toString("base64") };
  assert.equal(validateStay(valid).male, 1);
  assert.throws(() => validateStay({ ...valid, male: -1 }), /whole number/);
  assert.throws(() => validateStay({ ...valid, male: 0, female: 0, children: 0 }), /At least one traveller/);
  assert.throws(() => validateStay({ ...valid, checkInDate: "2026-10-27" }), /Check-in date/);
  assert.throws(() => validateStay({ ...valid, aadhaarMime: "text/plain" }), /PDF, JPG, or PNG/);
  assert.throws(() => validateStay({ ...valid, aadhaarBase64: "" }), /smaller than 5 MB/);
});
test("registration reference is stable per mobile and form type", () => {
  assert.equal(registrationCode("food", "9876543210"), registrationCode("food", "9876543210"));
  assert.notEqual(registrationCode("food", "9876543210"), registrationCode("stay", "9876543210"));
});