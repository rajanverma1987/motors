/** Max attachments per dashboard entity (vendor, PO, sales commission, …). */
export const MAX_DASHBOARD_ENTITY_ATTACHMENTS = 50;

export const VENDOR_ATTACHMENTS_PREFIX = "/uploads/vendors/";
export const PURCHASE_ORDER_ATTACHMENTS_PREFIX = "/uploads/purchase-orders/";
export const SALES_COMMISSION_ATTACHMENTS_PREFIX = "/uploads/sales-commissions/";

/**
 * Sanitize { url, name }[] from API clients: only URLs under the allowed prefix.
 * @param {unknown} arr
 * @param {string} allowedUrlPrefix e.g. "/uploads/vendors/"
 */
export function normalizeEntityAttachmentsFromClient(arr, allowedUrlPrefix) {
  const prefix = String(allowedUrlPrefix || "").trim();
  if (!prefix) return [];
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((a) => a && typeof a.url === "string" && String(a.url).trim().startsWith(prefix))
    .slice(0, MAX_DASHBOARD_ENTITY_ATTACHMENTS)
    .map((a) => ({
      url: String(a.url).trim().slice(0, 500),
      name: String(a.name ?? a.url ?? "").trim().slice(0, 300) || String(a.url).trim(),
    }));
}

export function normalizeVendorAttachmentsFromClient(arr) {
  return normalizeEntityAttachmentsFromClient(arr, VENDOR_ATTACHMENTS_PREFIX);
}

export function normalizePurchaseOrderAttachmentsFromClient(arr) {
  return normalizeEntityAttachmentsFromClient(arr, PURCHASE_ORDER_ATTACHMENTS_PREFIX);
}

export function normalizeSalesCommissionAttachmentsFromClient(arr) {
  return normalizeEntityAttachmentsFromClient(arr, SALES_COMMISSION_ATTACHMENTS_PREFIX);
}
