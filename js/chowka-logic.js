/** Pure, unit-testable Chowka business rules. */
const REQUIRED = ["AjitSagarJi", "ViditSagarJi", "VijitSagarJi"];
const ALIASES = [
  ["ajitsagarji", "मुनिश्रीअजितसागरजी"],
  ["viditsagarji", "vivekanandsagarji", "मुनिश्रीविदितसागरजी", "ऐलकश्रीविवेकानंदसागरजी", "एलकश्रीविवेकानंदसागरजी"],
  ["vijitsagarji", "adarshbhaiyaji", "आदर्शभैयाजी", "ऐलकश्रीविजितसागरजी", "एलकश्रीविजितसागरजी"],
];
const normalize = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/g, "");
function rank(value) {
  const name = normalize(value);
  const index = ALIASES.findIndex((aliases) => aliases.some((alias) => name.includes(normalize(alias))));
  return index < 0 ? REQUIRED.length : index;
}
/** Completion requires each of the three designated Maharaj to have a Chowka entry. */
export function bothMaharajUpdated(rows) {
  const ranks = new Set((Array.isArray(rows) ? rows : []).map((row) => rank(row?.maharaj)).filter((value) => value < REQUIRED.length));
  return REQUIRED.every((_, index) => ranks.has(index));
}
/** Stable ordering: Ajit Sagar Ji, Vidit Sagar Ji, Vijit Sagar Ji, then other/unassigned rows. */
export function sortChowkaRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({ row, index, rank: rank(row?.maharaj) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index).map(({ row }) => row);
}
export function getChowkaDateBounds(today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const min = new Date(start); min.setDate(min.getDate() - 30);
  const toInputDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  return { min: toInputDate(min), max: toInputDate(start) };
}
export function isValidChowkaDate(value, today = new Date()) {
  if (!value) return false;
  const { min, max } = getChowkaDateBounds(today);
  return value >= min && value <= max;
}
