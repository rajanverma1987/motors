/** Simple portal hub (`/dashboards`) — horizontal screen tabs. */

export const SIMPLE_PORTAL_PATH = "/dashboards";

export const SIMPLE_TAB_CUSTOMERS = "customers";
export const SIMPLE_TAB_SERVICE_PROPOSALS = "service-proposals";
export const SIMPLE_TAB_INVOICES = "invoices";
export const SIMPLE_TAB_PURCHASE_ORDERS = "purchase-orders";
export const SIMPLE_TAB_INVENTORY = "inventory";

/** @deprecated Use SIMPLE_TAB_INVOICES */
export const SIMPLE_TAB_ACCOUNTS_RECEIVABLE = SIMPLE_TAB_INVOICES;

export const SIMPLE_TAB_IDS = [
  SIMPLE_TAB_CUSTOMERS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_PURCHASE_ORDERS,
  SIMPLE_TAB_INVENTORY,
];

/**
 * @param {string} tab
 */
export function simplePortalTabHref(tab) {
  return `${SIMPLE_PORTAL_PATH}?tab=${encodeURIComponent(tab)}`;
}
