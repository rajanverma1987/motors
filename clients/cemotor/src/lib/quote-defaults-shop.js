import Employee from "@/models/Employee";

export function todayQuoteDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Employee id for "Prepared by" when portal user email matches an employee row for the shop.
 * @param {string} shopEmail createdByEmail (portal owner)
 * @param {string} portalUserEmail logged-in user email
 * @returns {Promise<string>}
 */
export async function defaultPreparedByEmployeeIdForPortalUser(shopEmail, portalUserEmail) {
  const shop = String(shopEmail || "")
    .trim()
    .toLowerCase();
  const portal = String(portalUserEmail || "")
    .trim()
    .toLowerCase();
  if (!shop || !portal) return "";
  const rows = await Employee.find({ createdByEmail: shop }).select("_id email").lean();
  const row = rows.find((r) => String(r.email || "").trim().toLowerCase() === portal);
  return row?._id?.toString() ?? "";
}
