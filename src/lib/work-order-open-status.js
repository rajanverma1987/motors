/**
 * Whether a work order status is treated as "open" for technician search / filters.
 * @param {string} status
 */
export function isWorkOrderOpenStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return true;
  return !/^(completed?|complete|cancel|canceled|cancelled|closed|delivered|void|picked\s*up|picked|shipped|scrapped?|no\s*repair|rejected?)\b/i.test(
    s
  );
}
