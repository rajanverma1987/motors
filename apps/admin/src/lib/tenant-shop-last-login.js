import mongoose from "mongoose";
import User from "@/models/User";
import Tenant from "@/models/Tenant";
import { withDbName } from "@/lib/portal-password-reset";

/**
 * Read lastLoginAt from the tenant shop DB (owner user, else latest any user).
 */
export async function readShopOwnerLastLogin(tenant, baseUri) {
  if (!tenant?.mongoDbName || !baseUri) return null;
  let conn;
  try {
    const shopUri = withDbName(baseUri, tenant.mongoDbName);
    conn = await mongoose.createConnection(shopUri).asPromise();
    const ShopUser = conn.models.User || conn.model("User", User.schema);
    const email = String(tenant.ownerEmail || "").trim().toLowerCase();
    let last = null;
    if (email) {
      const u = await ShopUser.findOne({ email }).select("lastLoginAt").lean();
      last = u?.lastLoginAt || null;
    }
    if (!last) {
      const u = await ShopUser.findOne({ lastLoginAt: { $ne: null } })
        .sort({ lastLoginAt: -1 })
        .select("lastLoginAt")
        .lean();
      last = u?.lastLoginAt || null;
    }
    return last || null;
  } catch {
    return null;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }
}

/** Stamp Tenant.lastLoginAt at most once per UTC day (entitlement heartbeat). */
export async function touchTenantLastLogin(slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (!key) return;
  const now = new Date();
  const dayStart = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  await Tenant.updateOne(
    {
      slug: key,
      $or: [{ lastLoginAt: null }, { lastLoginAt: { $lt: dayStart } }],
    },
    { $set: { lastLoginAt: now } }
  );
}
