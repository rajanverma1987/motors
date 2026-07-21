/** Classic (current) portal vs simple dense portal. */

export const CLASSIC_PORTAL_PREFIX = "/dashboard";
export const SIMPLE_PORTAL_PREFIX = "/dashboards";

export const PORTAL_VIEW_CLASSIC = "classic";
export const PORTAL_VIEW_SIMPLE = "simple";

export function isSimplePortalPath(pathname) {
  if (!pathname) return false;
  return pathname === SIMPLE_PORTAL_PREFIX || pathname.startsWith(`${SIMPLE_PORTAL_PREFIX}/`);
}

export function isClassicPortalPath(pathname) {
  if (!pathname) return false;
  return pathname === CLASSIC_PORTAL_PREFIX || pathname.startsWith(`${CLASSIC_PORTAL_PREFIX}/`);
}

/** @returns {typeof PORTAL_VIEW_CLASSIC | typeof PORTAL_VIEW_SIMPLE} */
export function portalViewFromPathname(pathname) {
  return isSimplePortalPath(pathname) ? PORTAL_VIEW_SIMPLE : PORTAL_VIEW_CLASSIC;
}

/**
 * Map a path from one portal to the other.
 * Simple view hub is `/dashboards` (optional `?tab=`).
 * @param {string} pathname
 * @param {typeof PORTAL_VIEW_CLASSIC | typeof PORTAL_VIEW_SIMPLE} targetView
 * @param {string} [search] Query string including leading `?`
 */
export function switchPortalPath(pathname, targetView, search = "") {
  const query = search || "";

  if (targetView === PORTAL_VIEW_SIMPLE) {
    return `${SIMPLE_PORTAL_PREFIX}${query}`;
  }

  const pathOnly = (pathname || "").split("?")[0] || CLASSIC_PORTAL_PREFIX;
  if (isSimplePortalPath(pathOnly)) {
    return `${CLASSIC_PORTAL_PREFIX}/all-jobs`;
  }

  return `${pathOnly}${query}`;
}
