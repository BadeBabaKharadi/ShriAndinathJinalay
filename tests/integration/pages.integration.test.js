import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

describe("website entry points", () => {
  it("contains the main website pages", () => {
    const expected = ["index.html", "team.html", "kalash.html"];

    for (const file of expected) {
      expect(fs.existsSync(path.join(root, file)), `${file} should exist`).toBe(
        true,
      );
    }
  });
});
