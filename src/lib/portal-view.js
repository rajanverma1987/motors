/** Classic portal vs Simple (Basic) portal. Per-shop setting; default is Basic. */

export const CLASSIC_PORTAL_PREFIX = "/dashboard";
export const SIMPLE_PORTAL_PREFIX = "/dashboards";

export const PORTAL_VIEW_CLASSIC = "classic";
export const PORTAL_VIEW_SIMPLE = "simple";

export const PORTAL_UI_CLASSIC = "classic";
export const PORTAL_UI_SIMPLE = "simple";
export const PORTAL_UI_COOKIE = "motors_portal_ui";

/** Nav Classic/Simple switcher stays off; shops pick UI in Settings → Account. */
export const CLASSIC_PORTAL_UI_ENABLED = false;

export function normalizePortalUi(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase() === PORTAL_UI_CLASSIC
    ? PORTAL_UI_CLASSIC
    : PORTAL_UI_SIMPLE;
}

export function isClassicPortalUiCookie(cookieHeader) {
  const match = String(cookieHeader || "").match(/(?:^|;\s*)motors_portal_ui=([^;]*)/);
  if (!match) return false;
  try {
    return decodeURIComponent(match[1]).trim().toLowerCase() === PORTAL_UI_CLASSIC;
  } catch {
    return false;
  }
}

export function classicPortalHomePath() {
  return `${CLASSIC_PORTAL_PREFIX}/all-jobs`;
}

export function settingsPathForPortalUi(portalUi) {
  return normalizePortalUi(portalUi) === PORTAL_UI_CLASSIC
    ? `${CLASSIC_PORTAL_PREFIX}/settings`
    : `${SIMPLE_PORTAL_PREFIX}/settings?section=account`;
}

export function portalLandingPath({ calculatorOnlyAccount, portalUi } = {}) {
  if (calculatorOnlyAccount) return `${SIMPLE_PORTAL_PREFIX}?tab=calculators`;
  if (normalizePortalUi(portalUi) === PORTAL_UI_CLASSIC) return classicPortalHomePath();
  return SIMPLE_PORTAL_PREFIX;
}

function queryString(search) {
  if (!search) return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function searchParam(search, key) {
  const q = queryString(search).replace(/^\?/, "");
  return new URLSearchParams(q).get(key);
}

export function isSimpleCalculatorsPath(pathname, search = "") {
  const pathOnly = String(pathname || "").split("?")[0];
  if (pathOnly !== SIMPLE_PORTAL_PREFIX && pathOnly !== `${SIMPLE_PORTAL_PREFIX}/`) return false;
  return searchParam(search, "tab") === "calculators";
}

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
    return `${SIMPLE_PORTAL_PREFIX}/employees`;
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

/**
 * Map a Simple `/dashboards…` path to Classic `/dashboard…` for shops that chose Classic UI.
 * Calculators stay on Simple (`?tab=calculators`).
 * @param {string} pathname
 * @param {string} [search] including leading `?` or raw query
 */
export function simplePathToClassicRedirect(pathname, search = "") {
  const pathOnly = String(pathname || "").split("?")[0] || SIMPLE_PORTAL_PREFIX;
  const query = queryString(search);

  if (isSimpleCalculatorsPath(pathOnly, query)) {
    return `${SIMPLE_PORTAL_PREFIX}?tab=calculators`;
  }

  if (pathOnly === `${SIMPLE_PORTAL_PREFIX}/settings` || pathOnly.startsWith(`${SIMPLE_PORTAL_PREFIX}/settings/`)) {
    return `${CLASSIC_PORTAL_PREFIX}/settings`;
  }

  const tab = searchParam(query, "tab");
  /** @type {Record<string, string>} */
  const classicByTab = {
    customers: `${CLASSIC_PORTAL_PREFIX}/customers`,
    inventory: `${CLASSIC_PORTAL_PREFIX}/inventory`,
    reports: `${CLASSIC_PORTAL_PREFIX}/reports`,
    invoices: `${CLASSIC_PORTAL_PREFIX}/invoices`,
    "purchase-orders": `${CLASSIC_PORTAL_PREFIX}/purchase-orders`,
    "service-proposals": `${CLASSIC_PORTAL_PREFIX}/rfq`,
  };
  if (tab && classicByTab[tab]) return classicByTab[tab];

  return classicPortalHomePath();
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
