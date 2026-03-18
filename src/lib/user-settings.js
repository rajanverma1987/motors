/** Default preferences when none saved yet (extend as you add UI). */
export const USER_SETTINGS_DEFAULTS = {
  /** Email about product tips & best practices */
  marketingTips: true,
  /** Notify when new leads arrive (future use) */
  leadEmailAlerts: true,
  /** Default rows per page for dashboard tables */
  tablePageSize: 25,
  /** Denser table rows (future: wire to Table dense prop) */
  compactTables: false,
  /** First day of week for date pickers: 0 = Sunday, 1 = Monday */
  weekStartsOn: 0,
  /** ISO 4217 — how amounts are shown across the dashboard */
  currency: "USD",
  /** Public path to uploaded shop logo (set via POST /api/dashboard/settings/logo only) */
  logoUrl: "",
  /** Status dropdown options for work orders (order = list order) */
  workOrderStatuses: [...DEFAULT_WORK_ORDER_STATUSES],
  /**
   * Subset of workOrderStatuses in column order (left → right) on shop floor job board.
   * Omitted key in stored settings means “all statuses, same order as workOrderStatuses”.
   */
  shopFloorBoardOrder: [...DEFAULT_WORK_ORDER_STATUSES],
  /** Company billing address (invoices, AR, remittance) */
  accountsBillingAddress: "",
  /** Company shipping / ship-from address */
  accountsShippingAddress: "",
  /** Default payment terms label for invoices & vendor docs */
  accountsPaymentTerms: "net30",
  /** Bank details, payment links, etc. — bottom of printed / customer invoice */
  invoicePaymentOptions: "",
  /** Shown below payment options on invoice (print + customer view) */
  invoiceThankYouNote: "Thank you for your business!",
};

import { isAllowedCurrency } from "@/lib/format-currency";
import { DEFAULT_WORK_ORDER_STATUSES } from "@/lib/work-order-fields";

/** Keys the API will accept on PATCH (add new keys here when you add controls). */
export const USER_SETTINGS_ALLOWED_KEYS = new Set([
  "marketingTips",
  "leadEmailAlerts",
  "tablePageSize",
  "compactTables",
  "weekStartsOn",
  "currency",
  "workOrderStatuses",
  "shopFloorBoardOrder",
  "accountsBillingAddress",
  "accountsShippingAddress",
  "accountsPaymentTerms",
  "invoicePaymentOptions",
  "invoiceThankYouNote",
]);

const ACCOUNTS_PAYMENT_TERMS = new Set([
  "on_receipt",
  "net15",
  "net30",
  "net45",
  "net60",
]);

const TABLE_PAGE_SIZES = new Set([10, 25, 50, 100]);

/** @param {unknown} raw */
export function normalizeWorkOrderStatusList(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const label = String(item ?? "")
      .trim()
      .slice(0, 80);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= 25) break;
  }
  return out.length ? out : [...DEFAULT_WORK_ORDER_STATUSES];
}

/**
 * @param {unknown} boardRaw
 * @param {string[]} statusList allowed labels (normalized)
 */
export function normalizeShopFloorBoardOrder(boardRaw, statusList) {
  const allowed = new Set(statusList);
  const arr = Array.isArray(boardRaw) ? boardRaw : [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const label = String(item ?? "").trim();
    if (!label || !allowed.has(label) || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= 25) break;
  }
  return out;
}

export function mergeUserSettings(stored) {
  const s = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const merged = { ...USER_SETTINGS_DEFAULTS, ...s };
  merged.workOrderStatuses = normalizeWorkOrderStatusList(merged.workOrderStatuses);

  const storedHasBoard = Object.prototype.hasOwnProperty.call(s, "shopFloorBoardOrder");
  if (!storedHasBoard) {
    merged.shopFloorBoardOrder = [...merged.workOrderStatuses];
  } else {
    const rawBoard = Array.isArray(s.shopFloorBoardOrder) ? s.shopFloorBoardOrder : [];
    merged.shopFloorBoardOrder = normalizeShopFloorBoardOrder(rawBoard, merged.workOrderStatuses);
  }
  return merged;
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Record<string, unknown>}
 */
export function sanitizeUserSettingsPatch(body) {
  if (!body || typeof body !== "object") return {};
  const out = {};
  for (const key of USER_SETTINGS_ALLOWED_KEYS) {
    if (body[key] === undefined) continue;
    if (key === "tablePageSize") {
      const n = Number(body[key]);
      if (TABLE_PAGE_SIZES.has(n)) out[key] = n;
      continue;
    }
    if (key === "weekStartsOn") {
      const n = Number(body[key]);
      if (n === 0 || n === 1) out[key] = n;
      continue;
    }
    if (key === "currency") {
      const c = String(body[key] ?? "").toUpperCase().trim();
      if (isAllowedCurrency(c)) out[key] = c;
      continue;
    }
    if (key === "workOrderStatuses") {
      const arr = Array.isArray(body[key]) ? body[key] : [];
      const cleaned = arr
        .map((s) => String(s ?? "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 25);
      if (cleaned.length) out.workOrderStatuses = cleaned;
      continue;
    }
    if (key === "shopFloorBoardOrder") {
      const arr = Array.isArray(body[key]) ? body[key] : [];
      out.shopFloorBoardOrder = arr
        .map((s) => String(s ?? "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 25);
      continue;
    }
    if (key === "accountsBillingAddress" || key === "accountsShippingAddress") {
      out[key] = String(body[key] ?? "")
        .replace(/\r\n/g, "\n")
        .slice(0, 2000);
      continue;
    }
    if (key === "accountsPaymentTerms") {
      const v = String(body[key] ?? "").toLowerCase().trim();
      if (ACCOUNTS_PAYMENT_TERMS.has(v)) out[key] = v;
      continue;
    }
    if (key === "invoicePaymentOptions") {
      out[key] = String(body[key] ?? "")
        .replace(/\r\n/g, "\n")
        .slice(0, 4000);
      continue;
    }
    if (key === "invoiceThankYouNote") {
      out[key] = String(body[key] ?? "").replace(/\r\n/g, " ").slice(0, 500);
      continue;
    }
    if (typeof body[key] === "boolean") {
      out[key] = body[key];
    }
  }
  return out;
}
