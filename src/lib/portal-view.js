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
