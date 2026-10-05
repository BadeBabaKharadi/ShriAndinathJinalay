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

  it("targets the named production Firestore database and not (default)", async () => {
    const config = await readFileText("functions/config.js");
    const index = await readFileText("functions/index.js");
    const pratibha = await readFileText("functions/pratibha-functions.cjs");

    expect(config).toContain('"jcp-firestore-db-001"');
    expect(index).toContain("FIRESTORE_DATABASE_ID");
    expect(index).toContain("getFirestore(undefined, FIRESTORE_DATABASE_ID)");
    expect(pratibha).toContain("FIRESTORE_DATABASE_ID");
    expect(pratibha).toContain("getFirestore(undefined, FIRESTORE_DATABASE_ID)");
    expect(config).not.toContain('"(default)"');
  });
  });

  it("keeps Firestore inaccessible from the public client", async () => {
    const rules = await readFileText("firestore.rules");

    expect(rules).toContain("allow read, write: if false;");
  });

  it("keeps the public registration route removed while preserving admin operations", async () => {
    await expect(readFileText("registration.html")).rejects.toThrow();
    await expect(readFileText("coordinator-7x9p2.html")).rejects.toThrow();

    const admin = await readFileText("admin-7x9p2.html");
    const script = await readFileText("js/admin-7x9p2.js");
    const functions = await readFileText("functions/index.js");

    expect(admin).toContain("कुल बुक कूपन");
    expect(script).toContain("kshamawaniAdminStats");
    expect(functions).toContain("kshamawaniAdminStats");
    expect(functions).toContain("kshamawaniAdminDelete");
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
