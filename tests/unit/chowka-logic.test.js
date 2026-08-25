import { describe, expect, it } from "vitest";
import {
  bothMaharajUpdated,
  getChowkaDateBounds,
  isValidChowkaDate,
} from "../../js/chowka-logic.js";

describe("Chowka Maharaj update rule", () => {
  it("returns false when no Maharaj is populated", () => {
    expect(bothMaharajUpdated([])).toBe(false);
  });

  it("returns false when only one distinct Maharaj is populated", () => {
    expect(
      bothMaharajUpdated([
        { maharaj: "AjitSagarJi" },
        { maharaj: "" },
        { maharaj: "" },
      ]),
    ).toBe(false);
  });

  it("returns true when two distinct Maharaj names are populated", () => {
    expect(
      bothMaharajUpdated([
        { maharaj: "AjitSagarJi" },
        { maharaj: "VivekanandSagarJi" },
        { maharaj: "" },
      ]),
    ).toBe(true);
  });

  it("does not count the same Maharaj twice", () => {
    expect(
      bothMaharajUpdated([
        { maharaj: "VivekanandSagarJi" },
        { maharaj: "VivekanandSagarJi" },
        { maharaj: "" },
      ]),
    ).toBe(false);
  });
});

describe("Chowka date rule", () => {
  const today = new Date(2026, 7, 25);

  it("allows today", () => {
    expect(isValidChowkaDate("2026-08-25", today)).toBe(true);
  });

  it("allows exactly 30 days ago", () => {
    expect(isValidChowkaDate("2026-07-26", today)).toBe(true);
  });

  it("rejects tomorrow", () => {
    expect(isValidChowkaDate("2026-08-26", today)).toBe(false);
  });

  it("rejects dates older than 30 days", () => {
    expect(isValidChowkaDate("2026-07-25", today)).toBe(false);
  });

  it("returns the expected picker boundaries", () => {
    expect(getChowkaDateBounds(today)).toEqual({
      min: "2026-07-26",
      max: "2026-08-25",
    });
  });
});
