const MAX_LEN = 16;

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
