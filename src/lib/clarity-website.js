/** Microsoft Clarity — public marketing website only (not portal/admin after login). */

export const CLARITY_PROJECT_ID = "wota3fv3hy";

/**
 * Auth / account entry pages under the marketing shell — do not load Clarity here.
 * @param {string | null | undefined} pathname
 */
export function isClarityExcludedPath(pathname) {
  const p = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (p === "/login" || p.startsWith("/login/")) return true;
  if (p === "/register" || p.startsWith("/register/")) return true;
  return false;
}

/** Stop Clarity collect if a prior marketing page already loaded the script. */
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
