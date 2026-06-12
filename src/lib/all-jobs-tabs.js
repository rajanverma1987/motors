/** Combined RFQ · work orders · invoices hub (`/dashboard/all-jobs`). */

export const ALL_JOBS_PATH = "/dashboard/all-jobs";

/** Default portal landing after sign-in (non calculator-only accounts). */
export const DEFAULT_PORTAL_LANDING_PATH = ALL_JOBS_PATH;

export const ALL_JOBS_TAB_RFQ = "rfq";
export const ALL_JOBS_TAB_WORK_ORDERS = "work-orders";
export const ALL_JOBS_TAB_INVOICES = "invoices";

export const ALL_JOBS_TAB_IDS = [
  ALL_JOBS_TAB_RFQ,
  ALL_JOBS_TAB_WORK_ORDERS,
  ALL_JOBS_TAB_INVOICES,
];

/**
 * @param {string} tab
 */
export function allJobsTabHref(tab) {
  return `${ALL_JOBS_PATH}?tab=${encodeURIComponent(tab)}`;
}

/**
 * List route for embedded vs standalone page clients.
 * @param {boolean} embedded
 * @param {"rfq"|"work-orders"|"invoices"} tab
 * @param {string} standalonePath
 */
export function allJobsListPath(embedded, tab, standalonePath) {
  return embedded ? allJobsTabHref(tab) : standalonePath;
}
