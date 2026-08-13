/**
 * Policy-Based Access Control (PBAC) for the CRM dashboard.
 * Pages and actions define what can be governed by policies.
 *
 * `PAGES` matches Simple `/dashboards` hub + settings (product going forward).
 * Legacy Classic page ids remain accepted when loading older policies.
 */

/** Standard actions that can be granted per page */
export const ACTIONS = ["view", "create", "edit", "delete"];

/** Simple portal pages shown in Access Controls UI */
export const PAGES = [
  { id: "customers", label: "Customers (incl. leads)" },
  { id: "service-proposals", label: "Service Proposals" },
  { id: "invoices", label: "Invoice / Receivables" },
  { id: "purchase-orders", label: "Purchase / Payable" },
  { id: "inventory", label: "Inventory" },
  { id: "reports", label: "Reports" },
  { id: "master-data-search", label: "Master Data Search" },
  { id: "calculators", label: "Calculators" },
  { id: "settings", label: "Settings" },
  { id: "job-board", label: "Shop floor job board" },
  { id: "directory-listing", label: "Directory listing" },
  { id: "marketplace", label: "Marketplace" },
  { id: "job-postings", label: "Job postings" },
  { id: "employees", label: "Employees (Master)" },
  { id: "vendors", label: "Vendors (Master)" },
  { id: "sales-person", label: "Sales persons (Master)" },
  { id: "access-control", label: "Access controls" },
  { id: "integrations", label: "API integrations" },
  { id: "subscription", label: "Subscription" },
  { id: "support", label: "Support" },
];

/** Classic-only page ids still valid on stored policies until re-saved */
export const LEGACY_PAGE_IDS = [
  "dashboard",
  "leads",
  "motors",
  "quotes",
  "work-orders",
  "accounts-receivable",
  "taxes",
  "motor-tag",
  "accounts-payable",
  "logistics",
  "customer-portal",
];

const PAGE_IDS = new Set([...PAGES.map((p) => p.id), ...LEGACY_PAGE_IDS]);
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
