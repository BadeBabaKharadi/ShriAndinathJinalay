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
  it("defines a four-coupon maximum", async () => {
    const data = await readConfig();

    expect(data.id).toBe("kshamawani-2026");
    expect(data.date).toBe("2026-09-27");
    expect(data.registration.maxCoupons).toBe(4);
  });

  it("keeps the coordinator route out of search indexes", async () => {
    const html = await readFileText("coordinator-7x9p2.html");

    expect(html).toContain(
      'name="robots" content="noindex,nofollow,noarchive"',
    );
    expect(html).toContain("html5-qrcode");
  });

  it("uses mobile lookup and update-or-create behaviour", async () => {
    const client = await readFileText("js/registration.js");
    const backend = await readFileText("apps-script/Kshamawani2026.gs");
    const page = await readFileText("registration.html");
    const coordinator = await readFileText("js/coordinator.js");

    expect(client).toContain("const response = await lookup(mobile)");
    expect(client).toContain(
      'const action = existingRegistration ? "updateRegistration" : "createRegistration";',
    );
    expect(client).toContain("KW26|");
    expect(backend).toContain('action === "updateRegistration"');
    expect(backend).toContain("function updateRegistration_(data)");
    expect(backend).toContain("coupons <= 4");
    expect(page).toContain(
      "cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",
    );
    expect(coordinator).toContain('compact[0] === "KW26"');
  });
});
