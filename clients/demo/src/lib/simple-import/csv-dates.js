/**
 * CSV calendar-date helpers. Canonical import format is YYYY-MM-DD.
 */

import { toInputDateValue, toMongoCalendarDate } from "@/lib/format-date";

const CSV_DATE_HINT = "use YYYY-MM-DD (e.g. 2026-08-01)";

/**
 * Normalize a CSV cell to YYYY-MM-DD. Empty → "".
 * Accepts YYYY-MM-DD, YYYY-M-D, optional time suffix, and other parseable forms.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCsvCalendarDate(value) {
  let raw = String(value ?? "").trim();
  if (!raw) return "";
  // Excel text / formula prefixes
  if (raw.startsWith("'") || raw.startsWith("=")) raw = raw.slice(1).trim();
  if (!raw) return "";

  // Canonical ISO calendar day (optionally with time / timezone)
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
    if (m < 1 || m > 12 || d < 1 || d > 31) return "";
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "";
    return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // Year-first with / or .
  const ymd = raw.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (ymd) {
    return normalizeCsvCalendarDate(`${ymd[1]}-${ymd[2]}-${ymd[3]}`);
  }

  return toInputDateValue(raw);
}

/**
 * @param {unknown} value
 * @returns {Date|null}
 */
export function csvCalendarDateToMongo(value) {
  const ymd = normalizeCsvCalendarDate(value);
  return ymd ? toMongoCalendarDate(ymd) : null;
}

/**
 * Validate CSV row date columns. Non-empty values must parse (prefer YYYY-MM-DD).
 * @param {Record<string, unknown>} row
 * @param {string[]} columns — CSV header names
 * @returns {string[]}
 */
export function validateCsvDateColumns(row, columns) {
  const errs = [];
  for (const col of columns) {
    const raw = String(row?.[col] ?? "").trim();
    if (!raw) continue;
    if (!normalizeCsvCalendarDate(raw)) {
      errs.push(`${col} must be a valid date (${CSV_DATE_HINT})`);
    }
  }
  return errs;
}

export { CSV_DATE_HINT };
