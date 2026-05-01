const MAX_VENDOR_ATTACHMENTS = 50;
const VENDOR_UPLOAD_URL_PREFIX = "/uploads/vendors/";

/**
 * Sanitize attachment list from API clients (URLs must be vendor uploads on this host path).
 * @param {unknown} arr
 * @returns {{ url: string, name: string }[]}
 */
export function normalizeVendorAttachmentsFromClient(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((a) => a && typeof a.url === "string" && String(a.url).trim().startsWith(VENDOR_UPLOAD_URL_PREFIX))
    .slice(0, MAX_VENDOR_ATTACHMENTS)
    .map((a) => ({
      url: String(a.url).trim().slice(0, 500),
      name: String(a.name ?? a.url ?? "").trim().slice(0, 300) || String(a.url).trim(),
    }));
}
