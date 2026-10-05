const test = require("node:test");
const assert = require("node:assert/strict");

test("uses the production named Firestore database by default", () => {
  const config = require("../config");
  assert.equal(config.FIRESTORE_DATABASE_ID, "jcp-firestore-db-001");
});
