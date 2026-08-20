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

describe("public site data", () => {
  it("contains required home-page content", async () => {
    const home = await readJson("data/home.json");

    expect(home.announcement).toEqual(expect.any(String));
    expect(home.announcement.trim()).not.toBe("");
    expect(home.location).toEqual(expect.any(String));
    expect(home.location.trim()).not.toBe("");
  });

  it("contains a valid event identity and date range", async () => {
    const event = await readJson("data/event.json");

    expect(event.id).toEqual(expect.any(String));
    expect(event.id.trim()).not.toBe("");
    expect(event.dates.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(event.dates.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(event.dates.start <= event.dates.end).toBe(true);
    expect(Array.isArray(event.rules)).toBe(true);
    expect(event.rules.length).toBeGreaterThan(0);
    expect(event.timetable.schedule.length).toBeGreaterThan(0);
  });

  it("contains valid team records and unique team ids", async () => {
    const teams = await readJson("data/team.json");
    const ids = teams.map((team) => team.id);

    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);

    for (const team of teams) {
      expect(team.id).toEqual(expect.any(String));
      expect(team.name).toEqual(expect.any(String));
      expect(team.hindiName).toEqual(expect.any(String));
      expect(Array.isArray(team.members)).toBe(true);

      for (const member of team.members) {
        expect(member.name).toEqual(expect.any(String));
        expect(member.name.trim()).not.toBe("");

        if (member.mobile !== undefined) {
          expect(String(member.mobile)).toMatch(/^\d{10}$/);
        }
      }
    }
  });

  it("contains valid Kalash records with deterministic categories", async () => {
    const kalash = await readJson("data/chaturmas-kalash.json");

    expect(Array.isArray(kalash)).toBe(true);
    expect(kalash.length).toBeGreaterThan(0);

    for (const item of kalash) {
      expect(item).toEqual(expect.any(Object));
      expect(item.kalashNumber).toBeDefined();
      expect(item.category).toEqual(expect.any(String));
      expect(item.category.trim()).not.toBe("");
    }
  });
});
