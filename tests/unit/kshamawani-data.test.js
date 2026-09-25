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
  });

  it("keeps the coordinator route out of search indexes", async () => {
    const html = await readFileText("coordinator-7x9p2.html");

    expect(html).toContain(
      'name="robots" content="noindex,nofollow,noarchive"',
    );
    expect(html).toContain("html5-qrcode");
  });

  it("uses indexed mobile and application-code lookups", async () => {
    const client = await readFileText("js/registration.js");
    const backend = await readFileText("apps-script/Kshamawani2026.gs");
    const page = await readFileText("registration.html");
    const coordinator = await readFileText("js/coordinator.js");

    expect(client).toContain("const response = await lookup(mobile)");
    expect(client).toContain("const action = existingRegistration");
    expect(client).toContain('? "updateRegistration"');
    expect(client).toContain(': "createRegistration";');
    expect(client).toContain("KW26|");
    expect(backend).toContain('action === "updateRegistration"');
    expect(backend).toContain("function updateRegistration_(data)");
    expect(backend).toContain("coupons <= 6");
    expect(backend).toContain("CacheService.getScriptCache()");
    expect(backend).toContain("buildLookupIndexes_()");
    expect(backend).toContain("function getKshamawaniHealth()");
    expect(page).toContain(
      "cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",
    );
    expect(coordinator).toContain('compact[0] === "KW26"');
    expect(coordinator).toContain("lookupByCode(code)");
    expect(coordinator).toContain("await hideScanner()");
    expect(coordinator).toContain("भौतिक टोकन जारी करें");
    expect(coordinator).toContain("अगला QR कोड स्कैन करें");
    expect(coordinator).toContain("showScanner()");
    expect(coordinator).toContain("result.scrollIntoView");
    expect(backend).toContain(
      "function lookupRegistrationByCode_(eventId, code)",
    );
    expect(backend).toContain("p.code");
  });

  it("does not log registration PII in performance telemetry", async () => {
    const backend = await readFileText("apps-script/Kshamawani2026.gs");

    expect(backend).toContain('event: "kshamawani.performance"');
    expect(backend).toContain("durationMs");
    expect(backend).not.toContain("console.log(mobile");
    expect(backend).not.toContain("console.log(code");
  });
});
