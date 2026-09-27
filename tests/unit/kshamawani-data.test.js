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

  it("keeps the public registration and coordinator routes retired", async () => {
    await expect(
      readFileText("registration.html").catch(() => null),
    ).resolves.toBeNull();
    await expect(
      readFileText("coordinator-7x9p2.html").catch(() => null),
    ).resolves.toBeNull();
  });

  it("keeps the protected admin route available", async () => {
    const html = await readFileText("admin-7x9p2.html");
    expect(html).toContain("कुल बुक कूपन");
  });

  it("allows both public domain aliases to call protected functions", async () => {
    const functions = await readFileText("functions/index.js");

    expect(functions).toContain('"https://badebabakharadi.com"');
    expect(functions).toContain('"https://babakharadi.com"');
    expect(functions).toContain('"https://www.babakharadi.com"');
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
