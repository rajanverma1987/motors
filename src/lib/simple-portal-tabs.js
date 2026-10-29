/** Simple portal hub (`/dashboards`) — horizontal screen tabs. */

export const SIMPLE_PORTAL_PATH = "/dashboards";

export const SIMPLE_TAB_DASHBOARD = "dashboard";
/** Optional Hub tab. Shown second, after Dashboard, when Settings enables it. */
export const SIMPLE_TAB_JOB_BOARD = "job-board";
export const SIMPLE_TAB_CUSTOMERS = "customers";
export const SIMPLE_TAB_SERVICE_PROPOSALS = "service-proposals";
/**
 * Legacy hub tab id. Motor Down RFQs now live under Customers → Leads.
 * Kept so old links can redirect.
 */
export const SIMPLE_TAB_TRACK_RFQS = "track-rfqs";
export const SIMPLE_TAB_INVOICES = "invoices";
export const SIMPLE_TAB_EXPENSES = "expenses";
export const SIMPLE_TAB_PURCHASE_ORDERS = "purchase-orders";
export const SIMPLE_TAB_INVENTORY = "inventory";
export const SIMPLE_TAB_REPORTS = "reports";
export const SIMPLE_TAB_MASTER_DATA_SEARCH = "master-data-search";
export const SIMPLE_TAB_CALCULATORS = "calculators";

/** @deprecated Use SIMPLE_TAB_INVOICES */
export const SIMPLE_TAB_ACCOUNTS_RECEIVABLE = SIMPLE_TAB_INVOICES;

/** Deep-link Customers → Leads → IQMotorTrack. */
export const SIMPLE_CUSTOMERS_LEADS_HREF = `${SIMPLE_PORTAL_PATH}?tab=${SIMPLE_TAB_CUSTOMERS}&filter=Lead&leadSource=track`;

export const SIMPLE_TAB_IDS = [
  SIMPLE_TAB_DASHBOARD,
  SIMPLE_TAB_CUSTOMERS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_EXPENSES,
  SIMPLE_TAB_PURCHASE_ORDERS,
  SIMPLE_TAB_INVENTORY,
  SIMPLE_TAB_REPORTS,
  SIMPLE_TAB_MASTER_DATA_SEARCH,
  SIMPLE_TAB_CALCULATORS,
];

/**
 * @param {string} tab
 */
export function simplePortalTabHref(tab) {
  return `${SIMPLE_PORTAL_PATH}?tab=${encodeURIComponent(tab)}`;
}

/** Full-page Service Proposal form (phone). */
export const SIMPLE_SERVICE_PROPOSAL_FORM_BASE = `${SIMPLE_PORTAL_PATH}/service-proposals`;

/**
 * @param {string} [id] blank or "new" → create URL
 */
export function simpleServiceProposalFormHref(id = "") {
  const raw = String(id || "").trim();
  if (!raw || raw === "new") return `${SIMPLE_SERVICE_PROPOSAL_FORM_BASE}/new`;
  return `${SIMPLE_SERVICE_PROPOSAL_FORM_BASE}/${encodeURIComponent(raw)}`;
}

/** Full-page Purchase Order form (phone). */
export const SIMPLE_PURCHASE_ORDER_FORM_BASE = `${SIMPLE_PORTAL_PATH}/purchase-orders`;

/**
 * @param {string} [id] blank or "new" → create URL
 */
export function simplePurchaseOrderFormHref(id = "") {
  const raw = String(id || "").trim();
  if (!raw || raw === "new") return `${SIMPLE_PURCHASE_ORDER_FORM_BASE}/new`;
  return `${SIMPLE_PURCHASE_ORDER_FORM_BASE}/${encodeURIComponent(raw)}`;
}
