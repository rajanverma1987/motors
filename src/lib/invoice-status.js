/** Invoice payment / lifecycle status (stored slug on Invoice.status). */
export const INVOICE_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partial_paid", label: "Partial Paid" },
  { value: "fully_paid", label: "Fully Paid" },
];

const SLUG_SET = new Set(INVOICE_STATUS_OPTIONS.map((o) => o.value));

const LEGACY_MAP = {
  draft: "draft",
  sent: "sent",
  partial_paid: "partial_paid",
  fully_paid: "fully_paid",
  partialpaid: "partial_paid",
  fullypaid: "fully_paid",
  "partial paid": "partial_paid",
  "fully paid": "fully_paid",
};

/** Normalize stored status to a known slug (for selects / badges). */
export function normalizeInvoiceStatusSlug(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (SLUG_SET.has(s)) return s;
  const fromLegacy = LEGACY_MAP[s] || LEGACY_MAP[String(raw ?? "").trim().toLowerCase()];
  if (fromLegacy) return fromLegacy;
  return SLUG_SET.has(s) ? s : "draft";
}

export function invoiceStatusLabel(slug) {
  const s = normalizeInvoiceStatusSlug(slug);
  return INVOICE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? String(slug || "Draft");
}

export function invoiceStatusBadgeVariant(slug) {
  const s = normalizeInvoiceStatusSlug(slug);
  if (s === "fully_paid") return "success";
  if (s === "partial_paid") return "warning";
  if (s === "sent") return "primary";
  return "default";
}
