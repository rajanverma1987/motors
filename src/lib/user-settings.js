/** Default preferences when none saved yet (extend as you add UI). */
export const USER_SETTINGS_DEFAULTS = {
  /** Email about product tips & best practices */
  marketingTips: true,
  /** Notify when new leads arrive (future use) */
  leadEmailAlerts: true,
  /** Default rows per page for dashboard tables */
  tablePageSize: 25,
  /** Denser table rows on dashboard list / summary tables */
  compactTables: false,
  /** First day of week for date pickers: 0 = Sunday, 1 = Monday */
  weekStartsOn: 0,
  /** ISO 4217 — how amounts are shown across the dashboard */
  currency: "USD",
  /** UI zoom for dashboard only (75–150, step 5). 100 = default browser-like size. */
  zoomLevel: DISPLAY_ZOOM_DEFAULT,
  /** Base font scale for dashboard only (75–150, step 5). 100 = default; scales rem-based text. */
  fontSizeLevel: DISPLAY_FONT_SIZE_DEFAULT,
  /** Public path to uploaded shop logo (set via POST /api/dashboard/settings/logo only) */
  logoUrl: "",
  /** Logo size on printed documents and customer/vendor emails (50–300, step 10). 100 = current default. */
  logoDocumentScale: LOGO_DOCUMENT_SCALE_DEFAULT,
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
  /** Bin / shelf labels for inventory items (dropdown on master inventory) */
  inventoryLocations: [],
  /**
   * Work order status → tile preset index (string "0"…"n") for shop floor column headers.
   * Omitted statuses use automatic rotation by column order.
   */
  workOrderStatusTileColors: {},
  /** Controlled dropdown definitions (quote_status, work_order_status, invoice_status, po_payment_status) — see dropdown-catalog.js */
  controlledDropdowns: {},
  /** Product form dropdowns (transport, quote type, payment methods) — see product-dropdown-catalog.js */
  productDropdowns: {},
  /** Optional prefix for new repair-flow job numbers (blank = RF-00001 style). */
  prefixRepairJob: "",
  /** Optional prefix prepended to quote RFQ# on new invoices. */
  prefixInvoice: "",
  /** Optional prefix for new work order numbers before RFQ/job segment (blank = W-). */
  prefixWorkOrder: "",
  /** Workspace SMTP for customer-facing quote & invoice emails */
  smtpEnabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: "",
  smtpFromEmail: "",
  smtpFromName: "",
  /**
   * Shop dashboard UI: "simple" (Basic) or "classic".
   * Stored per shop in UserSettings — not a global SaaS flag.
   */
  portalUi: "simple",
  /** One-way QuickBooks Online sync (requires OAuth connection). */
  quickBooksEnabled: false,
  /** Work-order statuses that trigger QBO sync when a JOB enters them. */
  quickBooksJobClosedStatuses: ["Completed"],
  /** QBO Chart of Accounts Id used for invoice service lines. */
  quickBooksDefaultIncomeAccountId: "",
  /** QBO Chart of Accounts Id used for vendor bill expense lines. */
  quickBooksDefaultExpenseAccountId: "",
};

import { DISPLAY_ZOOM_DEFAULT, normalizeZoomLevel } from "@/lib/display-zoom";
import { DISPLAY_FONT_SIZE_DEFAULT, normalizeFontSizeLevel } from "@/lib/display-font-size";
import { LOGO_DOCUMENT_SCALE_DEFAULT, normalizeLogoDocumentScale } from "@/lib/logo-document-scale";
import { normalizePortalUi } from "@/lib/portal-view";
import { sanitizeDocumentNumberPrefix } from "@/lib/document-number-prefixes";
import { isAllowedCurrency } from "@/lib/format-currency";
import { DEFAULT_WORK_ORDER_STATUSES } from "@/lib/work-order-fields";
import { normalizeWorkOrderStatusTileColors, sanitizeWorkOrderStatusTileColorsPatch } from "@/lib/work-order-status-tiles";
import {
  normalizeControlledDropdowns,
  sanitizeControlledDropdownsPatch,
  deriveWorkOrderFieldsFromControlledEntries,
} from "@/lib/dropdown-catalog";
import { normalizeWorkspaceSmtpFields } from "@/lib/workspace-smtp-fields";
import { normalizeQuickBooksJobClosedStatuses } from "@/lib/quickbooks/job-closed-status";
import { normalizeProductDropdowns, sanitizeProductDropdownsPatch } from "@/lib/product-dropdown-catalog";

/** Keys the API will accept on PATCH (add new keys here when you add controls). */
export const USER_SETTINGS_ALLOWED_KEYS = new Set([
  "marketingTips",
  "leadEmailAlerts",
  "tablePageSize",
  "compactTables",
  "weekStartsOn",
  "currency",
  "zoomLevel",
  "fontSizeLevel",
  "logoDocumentScale",
  "workOrderStatuses",
  "shopFloorBoardOrder",
  "accountsBillingAddress",
  "accountsShippingAddress",
  "accountsPaymentTerms",
  "invoicePaymentOptions",
  "invoiceThankYouNote",
  "inventoryLocations",
  "workOrderStatusTileColors",
  "controlledDropdowns",
  "productDropdowns",
  "prefixRepairJob",
  "prefixInvoice",
  "prefixWorkOrder",
  "smtpEnabled",
  "smtpHost",
  "smtpPort",
  "smtpSecure",
  "smtpUser",
  "smtpPassword",
  "smtpFromEmail",
  "smtpFromName",
  "portalUi",
  "quickBooksEnabled",
  "quickBooksJobClosedStatuses",
  "quickBooksDefaultIncomeAccountId",
  "quickBooksDefaultExpenseAccountId",
]);

const ACCOUNTS_PAYMENT_TERMS = new Set([
  "on_receipt",
  "net15",
  "net30",
  "net45",
  "net60",
]);

const TABLE_PAGE_SIZES = new Set([10, 25, 50, 100]);

/** Allowed dashboard table page sizes (Settings → Display → Rows per page). */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Resolve a valid table page size from settings or a raw number.
 * @param {unknown} settingsOrValue
 */
export function resolveTablePageSize(settingsOrValue) {
  const n = Number(
    settingsOrValue && typeof settingsOrValue === "object"
      ? settingsOrValue.tablePageSize
      : settingsOrValue
  );
  return TABLE_PAGE_SIZES.has(n) ? n : USER_SETTINGS_DEFAULTS.tablePageSize;
}

/** @param {unknown} raw */
export function normalizeInventoryLocations(raw) {
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
    if (out.length >= 50) break;
  }
  return out;
}

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
  const list = Array.isArray(statusList) ? statusList : [];
  /** @type {Map<string, string>} lower → canonical spelling from dropdown */
  const allowedCanon = new Map();
  for (const x of list) {
    const raw = String(x ?? "").trim();
    const k = raw.toLowerCase();
    if (k && !allowedCanon.has(k)) allowedCanon.set(k, raw);
  }
  const arr = Array.isArray(boardRaw) ? boardRaw : [];
  const seenLower = new Set();
  const out = [];
  for (const item of arr) {
    const label = String(item ?? "").trim();
    if (!label) continue;
    const lower = label.toLowerCase();
    if (seenLower.has(lower)) continue;
    const canonical = allowedCanon.get(lower);
    if (!canonical) continue;
    seenLower.add(lower);
    out.push(canonical);
    if (out.length >= 25) break;
  }
  return out;
}

export function mergeUserSettings(stored) {
  const s = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const merged = { ...USER_SETTINGS_DEFAULTS, ...s };
  merged.workOrderStatuses = normalizeWorkOrderStatusList(merged.workOrderStatuses);

  const rawBoardForMigrate = Array.isArray(s.shopFloorBoardOrder) ? s.shopFloorBoardOrder : [];
  merged.controlledDropdowns = normalizeControlledDropdowns(
    merged.controlledDropdowns,
    merged.workOrderStatuses,
    merged.workOrderStatusTileColors,
    rawBoardForMigrate
  );
  const woDerived = deriveWorkOrderFieldsFromControlledEntries(
    merged.controlledDropdowns.work_order_status.entries
  );
  merged.workOrderStatuses = woDerived.statuses;
  merged.workOrderStatusTileColors = woDerived.tileColors;
  merged.shopFloorBoardOrder = normalizeShopFloorBoardOrder(
    woDerived.shopFloorBoardOrder,
    merged.workOrderStatuses
  );

  merged.inventoryLocations = normalizeInventoryLocations(merged.inventoryLocations);
  merged.productDropdowns = normalizeProductDropdowns(merged.productDropdowns);
  merged.prefixRepairJob = sanitizeDocumentNumberPrefix(merged.prefixRepairJob);
  merged.prefixInvoice = sanitizeDocumentNumberPrefix(merged.prefixInvoice);
  merged.prefixWorkOrder = sanitizeDocumentNumberPrefix(merged.prefixWorkOrder);
  merged.zoomLevel = normalizeZoomLevel(merged.zoomLevel);
  merged.fontSizeLevel = normalizeFontSizeLevel(merged.fontSizeLevel);
  merged.logoDocumentScale = normalizeLogoDocumentScale(merged.logoDocumentScale);
  merged.portalUi = normalizePortalUi(merged.portalUi);
  merged.workOrderStatusTileColors = normalizeWorkOrderStatusTileColors(
    merged.workOrderStatusTileColors,
    merged.workOrderStatuses
  );
  merged.quickBooksEnabled = !!merged.quickBooksEnabled;
  merged.quickBooksJobClosedStatuses = normalizeQuickBooksJobClosedStatuses(
    merged.quickBooksJobClosedStatuses,
    merged.workOrderStatuses
  );
  merged.quickBooksDefaultIncomeAccountId = String(
    merged.quickBooksDefaultIncomeAccountId || ""
  )
    .trim()
    .slice(0, 64);
  merged.quickBooksDefaultExpenseAccountId = String(
    merged.quickBooksDefaultExpenseAccountId || ""
  )
    .trim()
    .slice(0, 64);
  const smtp = normalizeWorkspaceSmtpFields(merged);
  Object.assign(merged, smtp);
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
    if (key === "zoomLevel") {
      out.zoomLevel = normalizeZoomLevel(body[key]);
      continue;
    }
    if (key === "fontSizeLevel") {
      out.fontSizeLevel = normalizeFontSizeLevel(body[key]);
      continue;
    }
    if (key === "logoDocumentScale") {
      out.logoDocumentScale = normalizeLogoDocumentScale(body[key]);
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
    if (key === "inventoryLocations") {
      out.inventoryLocations = normalizeInventoryLocations(body[key]);
      continue;
    }
    if (key === "productDropdowns") {
      out.productDropdowns = sanitizeProductDropdownsPatch(body[key]);
      continue;
    }
    if (key === "workOrderStatusTileColors") {
      out.workOrderStatusTileColors = sanitizeWorkOrderStatusTileColorsPatch(body[key]);
      continue;
    }
    if (key === "prefixRepairJob" || key === "prefixInvoice" || key === "prefixWorkOrder") {
      out[key] = sanitizeDocumentNumberPrefix(body[key]);
      continue;
    }
    if (key === "smtpEnabled" || key === "smtpSecure") {
      if (typeof body[key] === "boolean") out[key] = body[key];
      continue;
    }
    if (key === "smtpHost" || key === "smtpUser" || key === "smtpFromName") {
      out[key] = String(body[key] ?? "").trim().slice(0, key === "smtpFromName" ? 120 : 255);
      continue;
    }
    if (key === "smtpFromEmail") {
      out[key] = String(body[key] ?? "").trim().slice(0, 255).toLowerCase();
      continue;
    }
    if (key === "smtpPort") {
      const portNum = Number(body[key]);
      if (Number.isFinite(portNum) && portNum > 0 && portNum <= 65535) {
        out[key] = Math.round(portNum);
      }
      continue;
    }
    if (key === "smtpPassword") {
      const pw = String(body[key] ?? "").trim();
      if (pw) out[key] = pw;
      continue;
    }
    if (key === "portalUi") {
      out.portalUi = normalizePortalUi(body[key]);
      continue;
    }
    if (key === "quickBooksEnabled") {
      if (typeof body[key] === "boolean") out.quickBooksEnabled = body[key];
      continue;
    }
    if (key === "quickBooksJobClosedStatuses") {
      const arr = Array.isArray(body[key]) ? body[key] : [];
      out.quickBooksJobClosedStatuses = arr
        .map((s) => String(s ?? "").trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 25);
      continue;
    }
    if (key === "quickBooksDefaultIncomeAccountId" || key === "quickBooksDefaultExpenseAccountId") {
      out[key] = String(body[key] ?? "")
        .trim()
        .slice(0, 64);
      continue;
    }
    if (key === "controlledDropdowns") {
      const woLeg = normalizeWorkOrderStatusList(body.workOrderStatuses);
      const tilesLeg =
        body.workOrderStatusTileColors && typeof body.workOrderStatusTileColors === "object"
          ? body.workOrderStatusTileColors
          : {};
      const boardLeg = Array.isArray(body.shopFloorBoardOrder) ? body.shopFloorBoardOrder : [];
      const normalized = sanitizeControlledDropdownsPatch(
        body.controlledDropdowns,
        woLeg,
        tilesLeg,
        boardLeg
      );
      out.controlledDropdowns = normalized;
      const derived = deriveWorkOrderFieldsFromControlledEntries(normalized.work_order_status.entries);
      out.workOrderStatuses = derived.statuses;
      out.workOrderStatusTileColors = derived.tileColors;
      out.shopFloorBoardOrder = normalizeShopFloorBoardOrder(
        derived.shopFloorBoardOrder,
        derived.statuses
      );
      continue;
    }
    if (typeof body[key] === "boolean") {
      out[key] = body[key];
    }
  }
  return out;
}
