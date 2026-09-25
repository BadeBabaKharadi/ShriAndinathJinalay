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

async function readConfig() {
  return JSON.parse(await readFileText("data/kshamawani-2026.json"));
}

describe("Kshamawani configuration", () => {
  it("defines a six-coupon maximum", async () => {
    const data = await readConfig();

    expect(data.id).toBe("kshamawani-2026");
    expect(data.date).toBe("2026-09-27");
    expect(data.registration.maxCoupons).toBe(6);
    expect(data.registration.opensAt).toBe("2026-09-25T16:30:00+05:30");
    expect(data.registration.firebaseFunctionsBaseUrl).toBe(
      "https://asia-south1-jain-community-platform.cloudfunctions.net",
    );
  });

  it("keeps the coordinator route out of search indexes", async () => {
    const html = await readFileText("coordinator-7x9p2.html");

    expect(html).toContain(
      'name="robots" content="noindex,nofollow,noarchive"',
    );
    expect(html).toContain("html5-qrcode");
  });

  it("uses Firebase for public registration and protected Firebase coordination", async () => {
    const client = await readFileText("js/registration.js");
    const functions = await readFileText("functions/index.js");
    const coordinator = await readFileText("js/coordinator.js");

    expect(client).toContain("kshamawaniLookup");
    expect(client).toContain("kshamawaniCreate");
    expect(client).toContain("kshamawaniUpdate");
    expect(client).not.toContain("api=lookupRegistration");
    expect(client).not.toContain("iframe");
    expect(functions).toContain("kshamawaniCoordinatorLookup");
    expect(functions).toContain("kshamawaniIssue");
    expect(coordinator).toContain("kshamawaniCoordinatorLookup");
    expect(coordinator).toContain("kshamawaniIssue");
    expect(coordinator).toContain("getCameras");
    expect(coordinator).not.toContain("markTokensIssued");
    expect(coordinator).not.toContain("apiUrl");
  });

  it("keeps the Firebase mobile index opaque", async () => {
    const functions = await readFileText("functions/registration.js");

    expect(functions).toContain('sha256(eventId + ":" + mobile)');
    expect(functions).toContain("registrationMobileIndex");
  });

  it("does not log registration PII in the Apps Script telemetry", async () => {
    const backend = await readFileText("apps-script/Kshamawani2026.gs");

    expect(backend).toContain('event: "kshamawani.performance"');
    expect(backend).not.toContain("console.log(mobile");
    expect(backend).not.toContain("console.log(code");
  });
});
