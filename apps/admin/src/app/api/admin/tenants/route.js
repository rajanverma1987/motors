import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import ShopSubscription from "@/models/ShopSubscription";
import { getAdminSessionFromRequest } from "@/lib/auth-admin";
import { adminCan } from "@/lib/admin-rbac";
import { readShopOwnerLastLogin } from "@/lib/tenant-shop-last-login";

export async function GET(request) {
  const session = await getAdminSessionFromRequest(request);
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminCan(session.role, "tenants.read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  const tenants = await Tenant.find({})
    .select("-platformTenantKeyHash -supportHandoffSecret")
    .sort({ createdAt: -1 })
    .lean();

  const emails = [
    ...new Set(
      tenants
        .map((t) => String(t.ownerEmail || "").trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  const subs = emails.length
    ? await ShopSubscription.find({ ownerEmail: { $in: emails } })
        .populate("planId", "name slug planType")
        .lean()
    : [];
  const subByEmail = Object.fromEntries(subs.map((s) => [s.ownerEmail, s]));

  const baseUri = process.env.MONGODB_ADMIN_URI || process.env.MONGODB_URI || "";

  const withLogin = await Promise.all(
    tenants.map(async (t) => {
      let lastLoginAt = t.lastLoginAt || null;
      if (baseUri && t.mongoDbName) {
        const fromShop = await readShopOwnerLastLogin(t, baseUri);
        if (fromShop && (!lastLoginAt || new Date(fromShop) > new Date(lastLoginAt))) {
          lastLoginAt = fromShop;
          Tenant.updateOne({ _id: t._id }, { $set: { lastLoginAt: fromShop } }).catch(() => {});
        }
      }
      return { ...t, lastLoginAt };
    })
  );

  return NextResponse.json({
    tenants: withLogin.map((t) => {
      const email = String(t.ownerEmail || "").trim().toLowerCase();
      const s = email ? subByEmail[email] : null;
      const p = s?.planId;
      return {
        ...t,
        id: String(t._id),
        ownerEmail: email,
        lastLoginAt: t.lastLoginAt || null,
        subscriptionSummary: s
          ? {
              internalState: s.internalState,
              planName: p?.name || "—",
              planSlug: p?.slug || "",
              planType: p?.planType || "",
              revoked: !!s.revokedAt,
              gracePeriodEndsAt: s.gracePeriodEndsAt || null,
            }
          : null,
      };
    }),
  });
}
