const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applicationCode,
  mobileIndexId,
  normalizeMobile,
  serializeRegistration,
  validateRegistration,
} = require("../registration");

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
