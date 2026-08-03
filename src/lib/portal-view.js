/** Classic portal vs Simple dense portal. Classic UI is hidden; routes redirect to Simple. */

export const CLASSIC_PORTAL_PREFIX = "/dashboard";
export const SIMPLE_PORTAL_PREFIX = "/dashboards";

export const PORTAL_VIEW_CLASSIC = "classic";
export const PORTAL_VIEW_SIMPLE = "simple";

/** When false, Classic/Simple switcher is hidden and Classic paths redirect to Simple. */
export const CLASSIC_PORTAL_UI_ENABLED = false;

export function isSimplePortalPath(pathname) {
  if (!pathname) return false;
  return pathname === SIMPLE_PORTAL_PREFIX || pathname.startsWith(`${SIMPLE_PORTAL_PREFIX}/`);
}

/**
 * True for Classic `/dashboard` (not Simple `/dashboards`).
 * @param {string | null | undefined} pathname
 */
export function isClassicPortalPath(pathname) {
  if (!pathname) return false;
  if (isSimplePortalPath(pathname)) return false;
  return pathname === CLASSIC_PORTAL_PREFIX || pathname.startsWith(`${CLASSIC_PORTAL_PREFIX}/`);
}

/**
 * Map a Classic `/dashboard…` path to Simple `/dashboards…` (code kept; UI hidden).
 * @param {string} pathname
 * @param {string} [search] including leading `?` or raw query
 */
export function classicPathToSimpleRedirect(pathname, search = "") {
  const pathOnly = String(pathname || "").split("?")[0] || CLASSIC_PORTAL_PREFIX;
  let query = "";
  if (search) {
    query = search.startsWith("?") ? search : `?${search}`;
  }

  if (pathOnly === `${CLASSIC_PORTAL_PREFIX}/settings` || pathOnly.startsWith(`${CLASSIC_PORTAL_PREFIX}/settings/`)) {
    return `${SIMPLE_PORTAL_PREFIX}/settings${query}`;
  }

  if (
    pathOnly === `${CLASSIC_PORTAL_PREFIX}/calculators` ||
    pathOnly.startsWith(`${CLASSIC_PORTAL_PREFIX}/calculators/`)
  ) {
    return `${SIMPLE_PORTAL_PREFIX}?tab=calculators`;
  }

  /** @type {Record<string, string>} */
  const settingsSectionByPath = {
    [`${CLASSIC_PORTAL_PREFIX}/directory-listing`]: "directory-listing",
    [`${CLASSIC_PORTAL_PREFIX}/marketplace`]: "marketplace",
    [`${CLASSIC_PORTAL_PREFIX}/job-postings`]: "job-postings",
    [`${CLASSIC_PORTAL_PREFIX}/access-control`]: "access-controls",
    [`${CLASSIC_PORTAL_PREFIX}/job-board`]: "job-board",
    [`${CLASSIC_PORTAL_PREFIX}/subscription`]: "subscription",
    [`${CLASSIC_PORTAL_PREFIX}/support`]: "support",
    [`${CLASSIC_PORTAL_PREFIX}/integrations`]: "api-integration",
    [`${CLASSIC_PORTAL_PREFIX}/customer-portal`]: "account",
  };
  if (settingsSectionByPath[pathOnly]) {
    return `${SIMPLE_PORTAL_PREFIX}/settings?section=${settingsSectionByPath[pathOnly]}`;
  }
  if (pathOnly === `${CLASSIC_PORTAL_PREFIX}/employees`) {
    return `${SIMPLE_PORTAL_PREFIX}/settings?section=master&masterTab=employees`;
  }
  if (pathOnly === `${CLASSIC_PORTAL_PREFIX}/vendors`) {
    return `${SIMPLE_PORTAL_PREFIX}/settings?section=master&masterTab=vendors`;
  }
  if (pathOnly === `${CLASSIC_PORTAL_PREFIX}/sales-person`) {
    return `${SIMPLE_PORTAL_PREFIX}/settings?section=master&masterTab=sales-persons`;
  }

  /** @type {Record<string, string>} */
  const hubTabByPath = {
    [`${CLASSIC_PORTAL_PREFIX}/customers`]: "customers",
    [`${CLASSIC_PORTAL_PREFIX}/leads`]: "customers",
    [`${CLASSIC_PORTAL_PREFIX}/inventory`]: "inventory",
    [`${CLASSIC_PORTAL_PREFIX}/reports`]: "reports",
    [`${CLASSIC_PORTAL_PREFIX}/accounts-receivable`]: "invoices",
    [`${CLASSIC_PORTAL_PREFIX}/invoices`]: "invoices",
    [`${CLASSIC_PORTAL_PREFIX}/purchase-orders`]: "purchase-orders",
    [`${CLASSIC_PORTAL_PREFIX}/accounts-payable`]: "purchase-orders",
    [`${CLASSIC_PORTAL_PREFIX}/rfq`]: "service-proposals",
    [`${CLASSIC_PORTAL_PREFIX}/quotes`]: "service-proposals",
    [`${CLASSIC_PORTAL_PREFIX}/work-orders`]: "service-proposals",
    [`${CLASSIC_PORTAL_PREFIX}/all-jobs`]: "service-proposals",
  };
  if (hubTabByPath[pathOnly]) {
    return `${SIMPLE_PORTAL_PREFIX}?tab=${hubTabByPath[pathOnly]}`;
  }

  return `${SIMPLE_PORTAL_PREFIX}${query}`;
}

/** @returns {typeof PORTAL_VIEW_CLASSIC | typeof PORTAL_VIEW_SIMPLE} */
export function portalViewFromPathname(pathname) {
  return isSimplePortalPath(pathname) ? PORTAL_VIEW_SIMPLE : PORTAL_VIEW_CLASSIC;
}

/**
 * Map a path from one portal to the other.
 * Simple view hub is `/dashboards` (optional `?tab=`).
 * Settings: `/dashboards/settings` ↔ `/dashboard/settings`.
 * @param {string} pathname
 * @param {typeof PORTAL_VIEW_CLASSIC | typeof PORTAL_VIEW_SIMPLE} targetView
 * @param {string} [search] Query string including leading `?`
 */
export function switchPortalPath(pathname, targetView, search = "") {
  const query = search || "";
  const pathOnly = (pathname || "").split("?")[0] || CLASSIC_PORTAL_PREFIX;
  const onSettings =
    pathOnly === `${CLASSIC_PORTAL_PREFIX}/settings` ||
    pathOnly === `${SIMPLE_PORTAL_PREFIX}/settings`;

  if (targetView === PORTAL_VIEW_SIMPLE) {
    if (onSettings) return `${SIMPLE_PORTAL_PREFIX}/settings`;
    return `${SIMPLE_PORTAL_PREFIX}${query}`;
  }

  if (isSimplePortalPath(pathOnly)) {
    if (onSettings) return `${CLASSIC_PORTAL_PREFIX}/settings`;
    return `${CLASSIC_PORTAL_PREFIX}/all-jobs`;
  }

  return `${pathOnly}${query}`;
}
