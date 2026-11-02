/**
 * Strip leading zeros from a numeric customer ID. Non-numeric values are left as-is.
 * @param {unknown} value
 * @returns {string}
 */
export function formatCustomerNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^\d+$/.test(raw)) return raw;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? String(n) : raw;
}
