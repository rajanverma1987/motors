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
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const q = {};
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ email: rx }, { shopName: rx }, { contactName: rx }];
    }
    const [totalCount, users] = await Promise.all([
      User.countDocuments(q),
      User.find(q)
        .select("_id email shopName contactName canLogin createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);
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
    return NextResponse.json({ users: list, page, pageSize, totalCount });
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list users" },
      { status: 500 }
    );
  }
}
