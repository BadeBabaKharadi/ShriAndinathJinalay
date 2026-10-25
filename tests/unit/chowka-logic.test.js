import { describe, expect, it } from "vitest";
import {
  bothMaharajUpdated,
  getChowkaDateBounds,
  isValidChowkaDate,
  sortChowkaRows,
} from "../../js/chowka-logic.js";

describe("Chowka Maharaj completion rule", () => {
  it("returns false when fewer than all three required Maharaj are populated", () => {
    expect(bothMaharajUpdated([])).toBe(false);
    expect(
      bothMaharajUpdated([
        { maharaj: "AjitSagarJi" },
        { maharaj: "ViditSagarJi" },
      ]),
    ).toBe(false);
    expect(
      bothMaharajUpdated([
        { maharaj: "AjitSagarJi" },
        { maharaj: "ViditSagarJi" },
        { maharaj: "" },
      ]),
    ).toBe(false);
  });

  it("returns true only when Ajit, Vidit, and Vijit Sagar Ji are populated", () => {
    expect(
      bothMaharajUpdated([
        { maharaj: "AjitSagarJi" },
        { maharaj: "ViditSagarJi" },
        { maharaj: "VijitSagarJi" },
      ]),
    ).toBe(true);
  });

  it("does not treat duplicate entries as a missing Maharaj", () => {
    expect(
      bothMaharajUpdated([
        { maharaj: "AjitSagarJi" },
        { maharaj: "ViditSagarJi" },
        { maharaj: "ViditSagarJi" },
      ]),
    ).toBe(false);
  });

  it("sorts entries in Ajit, Vidit, Vijit order and preserves other rows afterward", () => {
    const rows = [
      { id: "vijit", maharaj: "VijitSagarJi" },
      { id: "other", maharaj: "Other Maharaj" },
      { id: "vidit", maharaj: "ViditSagarJi" },
      { id: "ajit", maharaj: "AjitSagarJi" },
    ];

    expect(sortChowkaRows(rows).map((row) => row.id)).toEqual([
      "ajit",
      "vidit",
      "vijit",
      "other",
    ]);
  });

  it("recognizes the former Vivekanand name as Vidit Sagar Ji for existing records", () => {
    expect(
      bothMaharajUpdated([
        { maharaj: "१०८ मुनि श्री अजित सागर जी" },
        { maharaj: "१०८ मुनि श्री विदित सागर जी" },
        { maharaj: "१०५ ऐलक श्री विजित सागर जी" },
      ]),
    ).toBe(true);
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
