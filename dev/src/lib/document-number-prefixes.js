const MAX_LEN = 16;

/** Escape string for use inside a RegExp (single segment). */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Allowed chars: letters, digits, hyphen, underscore. */
export function sanitizeDocumentNumberPrefix(raw) {
  return String(raw ?? "")
    .trim()
    .slice(0, MAX_LEN)
    .replace(/[^a-zA-Z0-9\-_]/g, "");
}

/** Repair job numbers: default RF-00001; custom prefix gets a trailing hyphen if missing. */
export function effectiveRepairJobNumberPrefix(mergedSettings) {
  const p = sanitizeDocumentNumberPrefix(mergedSettings?.prefixRepairJob);
  if (!p) return "RF-";
  return p.endsWith("-") ? p : `${p}-`;
}

/** Prepended to quote RFQ# when creating an invoice; empty = use RFQ# only. */
export function effectiveInvoiceNumberPrefix(mergedSettings) {
  return sanitizeDocumentNumberPrefix(mergedSettings?.prefixInvoice);
}

/** Work orders: W-{segment}-{n} by default; custom replaces W-. */
export function effectiveWorkOrderNumberPrefix(mergedSettings) {
  const p = sanitizeDocumentNumberPrefix(mergedSettings?.prefixWorkOrder);
  if (!p) return "W-";
  return p.endsWith("-") ? p : `${p}-`;
}

/** Shop PO numbers: P-A0001 by default; {prefix}-A{0001} sequence. */
export function effectiveShopPoNumberPrefix(mergedSettings) {
  const p = sanitizeDocumentNumberPrefix(mergedSettings?.prefixShopPo);
  const head = p || "P";
  return head.replace(/-+$/, "");
}

/** Match shop PO numbers: {prefix}-A0001, {prefix}-A0002, … */
export function shopPoNumberRegex(prefix) {
  const p = String(prefix ?? "P").trim().replace(/-+$/, "") || "P";
  return new RegExp(`^${escapeRegExp(p)}-A(\\d+)$`, "i");
}

/** Format a shop PO number: {prefix}-A0001 */
export function formatShopPoNumber(prefix, sequence) {
  const head = String(prefix ?? "P").trim().replace(/-+$/, "") || "P";
  const n = Number(sequence);
  const seq = Number.isFinite(n) && n > 0 ? n : 1;
  return `${head}-A${String(seq).padStart(4, "0")}`;
}

/**
 * Prepend `prefix` to `body` only if `body` does not already start with `prefix` (after trim).
 * Used for invoice numbers: prefix + quote RFQ# when the RFQ is not already prefixed.
 */
export function applyDocumentPrefixIfAbsent(prefix, body) {
  const p = String(prefix ?? "").trim();
  const b = String(body ?? "").trim();
  if (!p) return b;
  if (!b) return p;
  if (b.startsWith(p)) return b;
  return `${p}${b}`;
}

/**
 * Work order stem before the trailing "-{n}" sequence number. Avoids duplicating the WO head
 * when the RFQ/job slug already includes it (e.g. segment already "W-A00001").
 */
export function workOrderNumberStem(head, safeSegment) {
  const h = String(head || "W-").trim() || "W-";
  const s = String(safeSegment ?? "").trim() || "RFQ";
  if (s.startsWith(h)) return s;
  return `${h}${s}`;
}

/**
 * Regex that matches full work order numbers for a given stem (stem includes head + segment, no trailing counter).
 */
export function workOrderNumberPatternRegex(stem) {
  return new RegExp(`^${escapeRegExp(stem)}-\\d+$`);
}
