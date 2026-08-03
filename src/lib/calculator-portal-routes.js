/** Calculator-only portal users use Simple Calculators tab (and subpaths under /dashboards). */
export const CALCULATOR_ONLY_DASHBOARD_PATH = "/dashboards";
export const CALCULATOR_ONLY_DASHBOARD_HREF = "/dashboards?tab=calculators";

export function isCalculatorOnlyDashboardPath(pathname) {
  if (!pathname) return false;
  if (pathname === CALCULATOR_ONLY_DASHBOARD_PATH || pathname.startsWith(`${CALCULATOR_ONLY_DASHBOARD_PATH}/`)) {
    return true;
  }
  // Legacy Classic calculators route (redirects to Simple)
  return pathname === "/dashboard/calculators" || pathname.startsWith("/dashboard/calculators/");
}

/** Dashboard APIs still needed for in-dashboard calculator tools. */
export const CALCULATOR_ONLY_ALLOWED_DASHBOARD_API_PREFIXES = [
  "/api/dashboard/wire-sizes",
  "/api/dashboard/settings",
];

export function isCalculatorOnlyAllowedDashboardApi(pathname) {
  if (!pathname?.startsWith("/api/dashboard/")) return false;
  return CALCULATOR_ONLY_ALLOWED_DASHBOARD_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
