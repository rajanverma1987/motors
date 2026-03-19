import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ShopSubscription from "@/models/ShopSubscription";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const users = await User.find({})
      .select("_id email shopName contactName canLogin createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const emails = users.map((u) => u.email);
    const subs = await ShopSubscription.find({ ownerEmail: { $in: emails } })
      .populate("planId", "name slug planType")
      .lean();
    const subByEmail = Object.fromEntries(subs.map((s) => [s.ownerEmail, s]));
    const list = users.map((u) => {
      const s = subByEmail[u.email];
      const p = s?.planId;
      return {
        id: String(u._id),
        email: u.email,
        shopName: u.shopName || "",
        contactName: u.contactName || "",
        canLogin: u.canLogin !== false,
        createdAt: u.createdAt,
        subscriptionSummary: s
          ? {
              internalState: s.internalState,
              planName: p?.name || "—",
              planSlug: p?.slug || "",
              planType: p?.planType || "",
              revoked: !!s.revokedAt,
            }
          : null,
      };
    });
    return NextResponse.json({ users: list });
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list users" },
      { status: 500 }
    );
  }
}
