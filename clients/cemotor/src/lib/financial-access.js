import { mergePolicyResources, permissionsMapToObject, can } from "@/lib/pbac";

export const DEFAULT_FINANCIAL_ALLOWED_ROLES = [
  "Manager",
  "Office",
  "Supervisor",
  "Admin",
  "Owner",
  "Accountant",
  "Bookkeeper",
];

export const STANDARD_SHOP_ROLES = [
  "Technician",
  "Lead",
  "Office",
  "Supervisor",
  "Manager",
  "Other",
];

/**
 * Case-insensitive check if an employee role has financial access allowed by default.
 * @param {string} role
 * @param {string[]} [allowedRoles]
 */
export function isRoleAllowedFinancials(role, allowedRoles = DEFAULT_FINANCIAL_ALLOWED_ROLES) {
  const r = String(role || "").trim().toLowerCase();
  if (!r) return false;
  const list = Array.isArray(allowedRoles) && allowedRoles.length > 0
    ? allowedRoles
    : DEFAULT_FINANCIAL_ALLOWED_ROLES;
  const set = new Set(list.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean));
  return set.has(r);
}

/**
 * Determine whether a user or employee can view financial information
 * (costs, margins, pricing, rates, AP/AR, revenue).
 *
 * Rules:
 * 1. If owner and simulation is enabled in settings -> restricted (for testing).
 * 2. If owner and simulation is disabled -> full access.
 * 3. If shop-wide restriction setting is disabled -> full access.
 * 4. If employee has explicit "restricted" override -> restricted.
 * 5. If employee has explicit "allowed" override -> allowed.
 * 6. If any active policy for this employee grants "financials: view" -> allowed.
 * 7. Default: based on employee's role matching allowed roles.
 *
 * @param {{
 *   isOwner?: boolean,
 *   employee?: Record<string, unknown> | null,
 *   policies?: Array<Record<string, unknown>>,
 *   userSettings?: Record<string, unknown>,
 * }} options
 * @returns {{
 *   canViewFinancials: boolean,
 *   isRestricted: boolean,
 *   isSimulated?: boolean,
 *   reason: string,
 * }}
 */
export function computeEffectiveFinancialAccess({
  isOwner = false,
  employee = null,
  policies = [],
  userSettings = {},
} = {}) {
  const simulate = Boolean(userSettings?.simulateFinancialRestriction);

  if (isOwner) {
    if (simulate) {
      return {
        canViewFinancials: false,
        isRestricted: true,
        isSimulated: true,
        reason: "Simulated restricted employee view",
      };
    }
    return {
      canViewFinancials: true,
      isRestricted: false,
      reason: "Shop owner full financial access",
    };
  }

  // If shop owner disabled restriction entirely
  if (userSettings?.financialAccessRestrictionEnabled === false) {
    return {
      canViewFinancials: true,
      isRestricted: false,
      reason: "Financial restrictions disabled shop-wide",
    };
  }

  const explicitAccess = String(employee?.financialAccess || "role").trim().toLowerCase();
  if (explicitAccess === "restricted") {
    return {
      canViewFinancials: false,
      isRestricted: true,
      reason: "Employee financial access explicitly restricted",
    };
  }

  if (explicitAccess === "allowed") {
    return {
      canViewFinancials: true,
      isRestricted: false,
      reason: "Employee financial access explicitly granted",
    };
  }

  // Check PBAC policies for this employee
  if (Array.isArray(policies) && policies.length > 0) {
    const merged = mergePolicyResources(policies);
    const permissions = permissionsMapToObject(merged);
    if (can(permissions, "financials", "view")) {
      return {
        canViewFinancials: true,
        isRestricted: false,
        reason: "Granted via Access Control Policy (financials: view)",
      };
    }
  }

  // Role-based default
  const allowedRoles = Array.isArray(userSettings?.financialAllowedRoles)
    ? userSettings.financialAllowedRoles
    : DEFAULT_FINANCIAL_ALLOWED_ROLES;

  const role = String(employee?.role || "").trim();
  const allowed = isRoleAllowedFinancials(role, allowedRoles);

  return {
    canViewFinancials: allowed,
    isRestricted: !allowed,
    reason: allowed
      ? `Role granted (${role || "Authorized role"})`
      : `Role restricted (${role || "Technician / Floor staff"})`,
  };
}

