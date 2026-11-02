/** Sanitize work-order / motor spec objects for API persistence. */
export function sanitizeSpecs(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k !== "string" || k.length > 80) continue;
    out[k] = v == null ? "" : String(v).slice(0, 500);
  }
  return out;
}
