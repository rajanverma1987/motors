/**
 * Admin role checks for admin.3phaseflow.com.
 * owner: everything
 * admin: listings, leads, tenants, Open shop (not owner-only controls)
 */

export const ADMIN_ROLE_OWNER = "owner";
export const ADMIN_ROLE_ADMIN = "admin";

const OWNER_ONLY = new Set([
  "admin.users.manage",
  "tenant.keys.rotate",
  "tenant.delete",
  "billing.keys",
]);

const ADMIN_ALLOWED = new Set([
  "listings.manage",
  "leads.manage",
  "tenants.read",
  "tenants.provision",
  "tenants.open_shop",
  "tenants.password_reset",
  "tenants.suspend",
  "nurture.manage",
]);

export function normalizeAdminRole(role) {
  const r = String(role || "").trim().toLowerCase();
  return r === ADMIN_ROLE_OWNER ? ADMIN_ROLE_OWNER : ADMIN_ROLE_ADMIN;
}

export function adminCan(role, permission) {
  const r = normalizeAdminRole(role);
  const perm = String(permission || "").trim();
  if (!perm) return false;
  if (r === ADMIN_ROLE_OWNER) return true;
  if (OWNER_ONLY.has(perm)) return false;
  return ADMIN_ALLOWED.has(perm);
}
