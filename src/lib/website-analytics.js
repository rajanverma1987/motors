/**
 * Public marketing site analytics (GA4 + Clarity).
 * Never collect on dashboard / admin (or other private app shells).
 */

export const GA_MEASUREMENT_ID = "G-RTSF7V6T7M";
export const CLARITY_PROJECT_ID = "wota3fv3hy";

/** Hosts that are our brand / legacy brand. Treat as self-referral, not a channel. */
const SELF_REFERRAL_ROOT_HOSTS = ["iqmotorbase.com", "motorswinding.com"];

/**
 * @param {string | null | undefined} pathname
 */
export function normalizePathname(pathname) {
  return String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
}

/**
 * Private product UI: do not load or send analytics.
 * @param {string | null | undefined} pathname
 */
export function isPrivateAppPath(pathname) {
  const p = normalizePathname(pathname);
  if (p === "/dashboard" || p.startsWith("/dashboard/")) return true;
  if (p === "/dashboards" || p.startsWith("/dashboards/")) return true;
  if (p === "/admin" || p.startsWith("/admin/")) return true;
  return false;
}

/**
 * Marketing shell paths where Clarity should not run (auth entry).
 * GA may still run here for funnel measurement.
 * @param {string | null | undefined} pathname
 */
export function isClarityExcludedPath(pathname) {
  if (isPrivateAppPath(pathname)) return true;
  const p = normalizePathname(pathname);
  if (p === "/login" || p.startsWith("/login/")) return true;
  if (p === "/register" || p.startsWith("/register/")) return true;
  return false;
}

/**
 * @param {string | null | undefined} referrer
 */
export function isSelfReferrer(referrer) {
  const raw = String(referrer || "").trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    return SELF_REFERRAL_ROOT_HOSTS.some((root) => host === root || host.endsWith(`.${root}`));
  } catch {
    return false;
  }
}

/** GA disable flag key for this measurement ID. */
export function gaDisableKey() {
  return `ga-disable-${GA_MEASUREMENT_ID}`;
}

/** Stop Clarity if a prior marketing page already loaded the script. */
export function stopClarityCollect() {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.clarity === "function") {
      window.clarity("stop");
    }
  } catch {
    /* ignore */
  }
}

/** Disable GA4 collection (survives soft navigations into dashboard/admin). */
export function stopGoogleAnalytics() {
  if (typeof window === "undefined") return;
  try {
    window[gaDisableKey()] = true;
  } catch {
    /* ignore */
  }
}

/** Re-enable GA4 when returning to the public marketing site. */
export function enableGoogleAnalytics() {
  if (typeof window === "undefined") return;
  try {
    window[gaDisableKey()] = false;
  } catch {
    /* ignore */
  }
}

/** Stop all website analytics (dashboard / admin entry). */
export function stopWebsiteAnalytics() {
  stopClarityCollect();
  stopGoogleAnalytics();
}

/**
 * @param {string} pathname
 * @param {{ ignoreReferrer?: boolean }} [opts]
 */
export function sendGaPageView(pathname, opts = {}) {
  if (typeof window === "undefined") return;
  if (window[gaDisableKey()]) return;
  if (typeof window.gtag !== "function") return;
  if (isPrivateAppPath(pathname)) return;

  const ignoreReferrer = opts.ignoreReferrer === true || isSelfReferrer(document.referrer);
  const pagePath = `${normalizePathname(pathname)}${window.location.search || ""}`;

  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
    ...(ignoreReferrer ? { ignore_referrer: true } : {}),
  });
}
