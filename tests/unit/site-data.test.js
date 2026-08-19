import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function readJson(relativePath) {
  const content = await readFile(
    path.join(repositoryRoot, relativePath),
    "utf8",
  );
  return JSON.parse(content);
}

describe("current public site data", () => {
  it("contains the home-page content required by the existing experience", async () => {
    const home = await readJson("data/home.json");

    expect(home.announcement).toEqual(expect.any(String));
    expect(home.announcement.trim()).not.toBe("");
    expect(home.location).toEqual(expect.any(String));
    expect(home.location.trim()).not.toBe("");
  });

  it("contains a valid registration event identity", async () => {
    const event = await readJson("data/event.json");

    expect(event.id).toEqual(expect.any(String));
    expect(event.id.trim()).not.toBe("");
    expect(event.dates.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(event.dates.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
