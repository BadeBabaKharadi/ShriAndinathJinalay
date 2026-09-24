import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

it("defines the Kshamawani 2026 registration contract", async () => {
  const data = JSON.parse(await readFile(path.join(root, "data/kshamawani-2026.json"), "utf8"));
  expect(data.id).toBe("kshamawani-2026");
  expect(data.date).toBe("2026-09-27");
  expect(data.venue.name).toContain("आदिनाथ");
  expect(data.registration.maxCoupons).toBeGreaterThan(0);
  expect(data.registration.apiUrl).toMatch(/^https:\/\/script\.google\.com\//);
});

it("contains a coordinator route that is not indexed", async () => {
  const html = await readFile(path.join(root, "coordinator-7x9p2.html"), "utf8");
  expect(html).toContain('name="robots" content="noindex,nofollow,noarchive"');
  expect(html).toContain("html5-qrcode");
});
