/** Calculator-only portal users may only use this dashboard route (and subpaths). */
export const CALCULATOR_ONLY_DASHBOARD_PATH = "/dashboard/calculators";

export function isCalculatorOnlyDashboardPath(pathname) {
  if (!pathname) return false;
  return (
    pathname === CALCULATOR_ONLY_DASHBOARD_PATH ||
    pathname.startsWith(`${CALCULATOR_ONLY_DASHBOARD_PATH}/`)
  );
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
