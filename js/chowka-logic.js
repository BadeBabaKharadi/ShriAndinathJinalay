/**
 * Pure Chowka business rules.
 *
 * Kept separate so the important Maharaj/date rules can be unit-tested
 * without loading the browser page.
 */

/**
 * Returns true only when at least two DISTINCT, non-empty Maharaj names
 * are present in the Chowka rows.
 */
export function bothMaharajUpdated(rows) {
  const names = new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => String(row?.maharaj || "").trim())
      .filter(Boolean),
  );

  return names.size >= 2;
}

/**
 * Returns the allowed date boundaries.
 *
 * Today is allowed.
 * Today - 30 days is allowed.
 * Future dates and dates older than 30 days are not allowed.
 */
export function getChowkaDateBounds(today = new Date()) {
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const min = new Date(start);
  min.setDate(min.getDate() - 30);

  const toInputDate = (date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

  return {
    min: toInputDate(min),
    max: toInputDate(start),
  };
}

/**
 * Validates a yyyy-mm-dd Chowka date against the allowed range.
 */
export function isValidChowkaDate(value, today = new Date()) {
  if (!value) return false;

  const { min, max } = getChowkaDateBounds(today);
  return value >= min && value <= max;
}
