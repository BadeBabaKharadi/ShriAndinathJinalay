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
  it("defines the 2026 registration contract", async () => {
    const data = await readConfig();

    expect(data.id).toBe("kshamawani-2026");
    expect(data.date).toBe("2026-09-27");
    expect(data.venue.name).toContain("आदिनाथ");
    expect(data.registration.maxCoupons).toBeGreaterThan(0);
  });

  it("keeps the coordinator route out of search indexes", async () => {
    const html = await readFileText("coordinator-7x9p2.html");

    expect(html).toContain(
      'name="robots" content="noindex,nofollow,noarchive"',
    );
    expect(html).toContain("html5-qrcode");
  });

  it("uses the mobile number as the update-or-create key", async () => {
    const client = await readFileText("js/registration.js");
    const backend = await readFileText("apps-script/Kshamawani2026.gs");
    const page = await readFileText("registration.html");

    expect(client).toContain(
      "const existingResponse = await lookup(data.mobile)",
    );
    expect(client).toContain(
      'const action = existing ? "updateRegistration" : "createRegistration";',
    );
    expect(backend).toContain('action === "updateRegistration"');
    expect(backend).toContain("function updateRegistration_(data)");
    expect(backend).toContain('audit_("UPDATE"');
    expect(page).toContain("cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");
  });
});
