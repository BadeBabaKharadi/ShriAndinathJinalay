import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function readJson(relativePath) {
  const file = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe("site data integration", () => {
  it("loads team data with the expected team/member structure", () => {
    const teams = readJson("data/team.json");

    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);

    for (const team of teams) {
      expect(team).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          hindiName: expect.any(String),
          members: expect.any(Array),
        }),
      );

      for (const member of team.members) {
        expect(member).toEqual(
          expect.objectContaining({
            name: expect.any(String),
          }),
        );
      }
    }
  });

  it("loads Chaturmas Kalash data as a non-empty array", () => {
    const kalash = readJson("data/chaturmas-kalash.json");

    expect(Array.isArray(kalash)).toBe(true);
    expect(kalash.length).toBeGreaterThan(0);

    for (const item of kalash) {
      expect(item).toBeTruthy();
      expect(typeof item).toBe("object");
    }
  });
});