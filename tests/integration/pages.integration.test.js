import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

describe("website entry points", () => {
  it("contains the main website pages", () => {
    const expected = ["index.html", "team.html", "kalash.html", "admin-7x9p2.html"];

    for (const file of expected) {
      expect(fs.existsSync(path.join(root, file)), `${file} should exist`).toBe(
        true,
      );
    }
  });

  it("does not publish retired registration or coordinator pages", () => {
    for (const file of ["registration.html", "coordinator-7x9p2.html"]) {
      expect(fs.existsSync(path.join(root, file)), file + " should be removed").toBe(false);
    }
  });
});
