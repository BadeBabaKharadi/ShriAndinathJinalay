import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function readConfig() {
  const content = await readFile(
    path.join(repositoryRoot, "data/kshamawani-2026.json"),
    "utf8",
  );
  return JSON.parse(content);
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
    const html = await readFile(
      path.join(repositoryRoot, "coordinator-7x9p2.html"),
      "utf8",
    );

    expect(html).toContain(
      'name="robots" content="noindex,nofollow,noarchive"',
    );
    expect(html).toContain("html5-qrcode");
  });
});
