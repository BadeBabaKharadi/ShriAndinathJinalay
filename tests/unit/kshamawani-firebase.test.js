import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function readFileText(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

describe("Kshamawani Firebase registration", () => {
  it("configures the existing Firebase project and Mumbai region", async () => {
    const firebaseConfig = JSON.parse(await readFileText("firebase.json"));
    const firebaseProject = JSON.parse(await readFileText(".firebaserc"));
    const functions = JSON.parse(await readFileText("functions/package.json"));

    expect(firebaseProject.projects.default).toBe("jain-community-platform");
    expect(firebaseConfig.functions.runtime).toBe("nodejs22");
    expect(functions.engines.node).toBe("22");
  });

  it("keeps Firestore inaccessible from the public client", async () => {
    const rules = await readFileText("firestore.rules");

    expect(rules).toContain("allow read, write: if false;");
  });

  it("moves the coordinator to protected Firebase callables", async () => {
    const page = await readFileText("coordinator-7x9p2.html");
    const script = await readFileText("js/coordinator.js");
    const functions = await readFileText("functions/index.js");

    expect(page).toContain("coordinator.js");
    expect(script).toContain("kshamawaniVerifyAccess");
    expect(script).toContain("kshamawaniCoordinatorLookup");
    expect(script).toContain("kshamawaniIssue");
    expect(script).toContain("getCameras");
    expect(script).not.toContain("markTokensIssued");
    expect(script).not.toContain("apiUrl");
    expect(functions).toContain("defineSecret");
    expect(functions).toContain("KSHAMAWANI_ADMIN_KEY");
    expect(functions).toContain("kshamawaniVerifyAccess");
  });

  it("adds a protected operations dashboard", async () => {
    const page = await readFileText("admin-7x9p2.html");
    const script = await readFileText("js/admin-7x9p2.js");
    const functions = await readFileText("functions/index.js");

    expect(page).toContain("कुल बुक कूपन");
    expect(page).toContain("भौतिक कूपन जारी");
    expect(script).toContain("kshamawaniAdminStats");
    expect(script).toContain("kshamawaniAdminLookup");
    expect(script).toContain("kshamawaniAdminDelete");
    expect(functions).toContain("kshamawaniAdminStats");
    expect(functions).toContain("kshamawaniAdminDelete");
  });

  it("keeps the coupon count as a one-to-six selector", async () => {
    const page = await readFileText("registration.html");
    expect(page).toContain('<select id="coupons"');
    for (const value of ["1", "2", "3", "4", "5", "6"]) {
      expect(page).toContain(`<option value="${value}">${value}</option>`);
    }
    expect(page).not.toContain('id="coupons" name="coupons" type="number"');
  });

  it("moves public registration calls to Firebase callable endpoints", async () => {
    const client = await readFileText("js/registration.js");

    expect(client).toContain("kshamawaniLookup");
    expect(client).toContain("kshamawaniCreate");
    expect(client).toContain("kshamawaniUpdate");
    expect(client).not.toContain("api=lookupRegistration");
    expect(client).not.toContain("iframe");
  });

  it("keeps coordinator and admin operations protected", async () => {
    const admin = await readFileText("functions/admin.js");

    expect(admin).toContain("assertAdminKey");
    expect(admin).toContain("Issued-token registrations cannot be deleted.");
    expect(admin).toContain("totalPhysicalCouponsIssued");
    expect(admin).toContain("byDate");
    expect(admin).toContain("byCouponCount");
  });

  it("keeps the Firebase mobile index opaque", async () => {
    const functions = await readFileText("functions/registration.js");

    expect(functions).toContain('sha256(eventId + ":" + mobile)');
    expect(functions).toContain("registrationMobileIndex");
  });

  it("keeps the migration source external to the repository", async () => {
    const migration = await readFileText(
      "migration/migrate-kshamawani-to-firestore.mjs",
    );

    expect(migration).toContain("process.argv[2]");
    expect(migration).not.toContain("9860699870");
  });

  it("does not log registration PII in the Apps Script telemetry", async () => {
    const backend = await readFileText("apps-script/Kshamawani2026.gs");

    expect(backend).toContain('event: "kshamawani.performance"');
    expect(backend).not.toContain("console.log(mobile");
    expect(backend).not.toContain("console.log(code");
  });
});
