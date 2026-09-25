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
    const firebaseConfig = JSON.parse(
      await readFileText("firebase.json"),
    );
    const firebaseProject = JSON.parse(
      await readFileText(".firebaserc"),
    );
    const functions = JSON.parse(
      await readFileText("functions/package.json"),
    );

    expect(firebaseProject.projects.default).toBe(
      "jain-community-platform",
    );
    expect(firebaseConfig.functions.runtime).toBe("nodejs22");
    expect(functions.engines.node).toBe("22");
  });

  it("keeps Firestore inaccessible from the public client", async () => {
    const rules = await readFileText("firestore.rules");

    expect(rules).toContain("allow read, write: if false;");
  });

  it("keeps the coordinator on Apps Script for this migration", async () => {
    const page = await readFileText("coordinator-7x9p2.html");
    const script = await readFileText("js/coordinator.js");

    expect(page).toContain("coordinator.js");
    expect(script).toContain("markTokensIssued");
    expect(script).toContain("apiUrl");
  });

  it("moves public registration calls to Firebase callable endpoints", async () => {
    const client = await readFileText("js/registration.js");

    expect(client).toContain("kshamawaniLookup");
    expect(client).toContain("kshamawaniCreate");
    expect(client).toContain("kshamawaniUpdate");
    expect(client).not.toContain("api=lookupRegistration");
    expect(client).not.toContain("iframe");
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
