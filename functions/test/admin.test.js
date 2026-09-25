const test = require("node:test");
const assert = require("node:assert/strict");

const { assertAdminKey, dateKey, normalizeMobile } = require("../admin");

test("admin access requires an exact non-empty secret", () => {
  assert.doesNotThrow(() => assertAdminKey("secret", "secret"));
  assert.throws(() => assertAdminKey("", "secret"), /Unauthorized/);
  assert.throws(() => assertAdminKey("wrong", "secret"), /Unauthorized/);
});

test("normalizes coordinator mobile numbers", () => {
  assert.equal(normalizeMobile("+91 98606-99870"), "919860699870");
  assert.equal(normalizeMobile("98606-99870"), "9860699870");
});

test("groups registration timestamps by Pune calendar date", () => {
  assert.equal(
    dateKey(new Date("2026-09-24T19:00:00.000Z")),
    "2026-09-25",
  );
});
