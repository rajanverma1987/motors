/**
 * Policy-Based Access Control (PBAC) for the CRM dashboard.
 * Pages and actions define what can be governed by policies.
 */

/** Standard actions that can be granted per page */
export const ACTIONS = ["view", "create", "edit", "delete"];

/** Dashboard pages that can be protected (id = path segment, label for UI) */
export const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "leads", label: "Leads" },
  { id: "customers", label: "Customers" },
  { id: "motors", label: "Motor assets" },
  { id: "quotes", label: "Quotes" },
  { id: "work-orders", label: "Work orders" },
  { id: "invoices", label: "Invoices" },
  { id: "accounts-receivable", label: "Accounts receivable" },
  { id: "job-board", label: "Shop floor job board" },
  { id: "motor-tag", label: "Motor tag" },
  { id: "vendors", label: "Vendors" },
  { id: "purchase-orders", label: "Purchase orders" },
  { id: "accounts-payable", label: "Accounts payable" },
  { id: "logistics", label: "Logistics" },
  { id: "employees", label: "Employees" },
  { id: "job-postings", label: "Job postings (careers)" },
  { id: "calculators", label: "Calculators" },
  { id: "reports", label: "Reports" },
  { id: "customer-portal", label: "Customer portal" },
  { id: "access-control", label: "Access control" },
  { id: "settings", label: "Settings" },
  { id: "support", label: "Support" },
  { id: "inventory", label: "Inventory" },
  { id: "marketplace", label: "Marketplace (CRM)" },
  { id: "integrations", label: "API integrations" },
];

const PAGE_IDS = new Set(PAGES.map((p) => p.id));
const ACTION_SET = new Set(ACTIONS);

/**
 * Validate and normalize a single resource: { page, actions: string[] }
 */
export function normalizeResource(r) {
  if (!r || typeof r.page !== "string") return null;
  const page = r.page.trim().toLowerCase();
  if (!PAGE_IDS.has(page)) return null;
  const actions = Array.isArray(r.actions)
    ? r.actions.filter((a) => typeof a === "string" && ACTION_SET.has(a.trim().toLowerCase()))
    : [];
  const uniqueActions = [...new Set(actions.map((a) => a.trim().toLowerCase()))];
  if (uniqueActions.length === 0) return null;
  return { page, actions: uniqueActions };
}

/**
 * Normalize resources array from API/form. Returns array of { page, actions }.
 */
export function normalizeResources(resources) {
  if (!Array.isArray(resources)) return [];
  const seen = new Set();
  return resources
    .map(normalizeResource)
    .filter(Boolean)
    .filter((r) => {
      if (seen.has(r.page)) return false;
      seen.add(r.page);
      return true;
    });
}

/**
 * Merge multiple policies' resources into one permission map: { [pageId]: Set<action> }
 * Used to compute effective permissions for an employee (union of all allowed actions).
 */
export function mergePolicyResources(policies) {
  const map = {};
  for (const policy of policies || []) {
    const resources = Array.isArray(policy.resources) ? policy.resources : [];
    for (const r of resources) {
      const page = r?.page;
      const actions = Array.isArray(r?.actions) ? r.actions : [];
      if (!page || typeof page !== "string") continue;
      if (!map[page]) map[page] = new Set();
      for (const a of actions) if (typeof a === "string" && a) map[page].add(a);
    }
  }
  return map;
}

/**
 * Convert merged map to serializable form: { [pageId]: string[] }
 */
export function permissionsMapToObject(map) {
  const out = {};
  for (const [page, set] of Object.entries(map)) {
    if (set && set.size) out[page] = [...set];
  }
  return out;
}

/**
 * Check if a permission set allows the given action on the given page.
 */
export function can(permissions, pageId, action) {
  if (!permissions || typeof permissions !== "object") return false;
  const allowed = permissions[pageId];
  if (!Array.isArray(allowed)) return false;
  const a = (action || "").trim().toLowerCase();
  return allowed.includes(a);
}
