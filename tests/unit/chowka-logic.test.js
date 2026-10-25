import { describe, expect, it } from "vitest";
import { bothMaharajUpdated, getChowkaDateBounds, isValidChowkaDate, sortChowkaRows } from "../../js/chowka-logic.js";

describe("Chowka Maharaj completion rule", () => {
  it("returns false when none or only two required Maharaj are populated", () => {
    expect(bothMaharajUpdated([])).toBe(false);
    expect(bothMaharajUpdated([{maharaj:"AjitSagarJi"},{maharaj:"ViditSagarJi"}])).toBe(false);
  });
  it("returns true only when all three required Maharaj are populated", () => {
    expect(bothMaharajUpdated([{maharaj:"AjitSagarJi"},{maharaj:"ViditSagarJi"},{maharaj:"VijitSagarJi"}])).toBe(true);
  });
  it("does not count duplicates as a missing Maharaj", () => {
    expect(bothMaharajUpdated([{maharaj:"AjitSagarJi"},{maharaj:"ViditSagarJi"},{maharaj:"ViditSagarJi"}])).toBe(false);
  });
  it("sorts Ajit, Vidit, Vijit, then unassigned rows stably", () => {
    const rows=[{id:"vijit",maharaj:"VijitSagarJi"},{id:"blank",maharaj:""},{id:"vidit",maharaj:"ViditSagarJi"},{id:"ajit",maharaj:"AjitSagarJi"}];
    expect(sortChowkaRows(rows).map(row=>row.id)).toEqual(["ajit","vidit","vijit","blank"]);
  });
});
describe("Chowka date rule", () => {
  const today = new Date(2026, 7, 25);
  it("allows today", () => expect(isValidChowkaDate("2026-08-25", today)).toBe(true));
  it("allows exactly 30 days ago", () => expect(isValidChowkaDate("2026-07-26", today)).toBe(true));
  it("rejects tomorrow", () => expect(isValidChowkaDate("2026-08-26", today)).toBe(false));
  it("rejects dates older than 30 days", () => expect(isValidChowkaDate("2026-07-25", today)).toBe(false));
  it("returns expected picker boundaries", () => expect(getChowkaDateBounds(today)).toEqual({min:"2026-07-26",max:"2026-08-25"}));
});
