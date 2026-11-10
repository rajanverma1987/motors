import { toInputDateValue } from "@/lib/format-date";

/**
 * Client-side sort for dashboard `<Table>` when `sortState.key` is set.
 * @template T
 * @param {T[]|null|undefined} rows
 * @param {{ key?: string|null, direction?: string }} sortState
 * @param {(row: T, key: string) => unknown} [getSortValue]
 */
export function sortRowsClient(rows, sortState, getSortValue) {
  if (!rows?.length || !sortState?.key) return rows || [];
  const key = sortState.key;
  const mul = sortState.direction === "desc" ? -1 : 1;
  const get =
    typeof getSortValue === "function"
      ? (row) => getSortValue(row, key)
      : (row) => row?.[key];

  const list = [...rows];
  list.sort((a, b) => {
    const c = compareValues(get(a), get(b));
    if (c !== 0) return c * mul;
    const idA = a?.id != null ? String(a.id) : "";
    const idB = b?.id != null ? String(b.id) : "";
    return idA.localeCompare(idB);
  });
  return list;
}

/** True for ISO / slash / dot / dash calendar dates (not plain numbers). */
function looksLikeDateString(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return true;
  return /^\d{1,4}[./\-]\d{1,2}[./\-]\d{1,4}$/.test(t);
}

function compareValues(va, vb) {
  if (Object.is(va, vb)) return 0;

  const aEmpty = va == null || va === "";
  const bEmpty = vb == null || vb === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return -1;
  if (bEmpty) return 1;

  if (typeof va === "boolean" && typeof vb === "boolean") {
    return va === vb ? 0 : va ? 1 : -1;
  }

  if (typeof va === "number" && typeof vb === "number" && Number.isFinite(va) && Number.isFinite(vb)) {
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  }

  const sa = String(va).trim();
  const sb = String(vb).trim();

  // Dates like "6/11/2026" must not use parseFloat (that yields 6 and sorts by day/month only).
  if (looksLikeDateString(sa) && looksLikeDateString(sb)) {
    const da = toInputDateValue(sa);
    const db = toInputDateValue(sb);
    if (da && db) {
      if (da < db) return -1;
      if (da > db) return 1;
      return 0;
    }
  }

  const stripNum = (s) => s.replace(/[$,\s]/g, "");
  const na = Number.parseFloat(stripNum(sa));
  const nb = Number.parseFloat(stripNum(sb));
  const looksNumeric =
    sa !== "" &&
    sb !== "" &&
    !looksLikeDateString(sa) &&
    !looksLikeDateString(sb) &&
    Number.isFinite(na) &&
    Number.isFinite(nb) &&
    /^-?\d/.test(stripNum(sa)) &&
    /^-?\d/.test(stripNum(sb));
  if (looksNumeric) {
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  }

  return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
}
