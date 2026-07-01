import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ShopSubscription from "@/models/ShopSubscription";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { parseAdminSortParams, mongoSortFromAdmin, sortAndPaginateAdminRows } from "@/lib/admin-table-sort";

const ACTIVE_CLIENT_SORT_KEYS = [
  "email",
  "shopName",
  "contactName",
  "lastLoginAt",
  "subscriptionSummary",
  "accountType",
  "createdAt",
];
const ACTIVE_CLIENT_MONGO_SORT_KEYS = ["email", "shopName", "contactName", "lastLoginAt", "createdAt"];

/** GET: portal users who have signed in at least once (lastLoginAt set). */
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

    const q = { lastLoginAt: { $ne: null } };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ email: rx }, { shopName: rx }, { contactName: rx }];
    }

    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: ACTIVE_CLIENT_SORT_KEYS,
      defaultKey: "lastLoginAt",
      defaultDir: "desc",
    });
    const useMongoSort = ACTIVE_CLIENT_MONGO_SORT_KEYS.includes(sortBy);
    const [totalCount, users] = await Promise.all([
      User.countDocuments(q),
      useMongoSort
        ? User.find(q)
            .select("_id email shopName contactName canLogin listingOnlyAccount calculatorOnlyAccount createdAt lastLoginAt")
            .sort(mongoSortFromAdmin(sortBy, sortDir))
            .skip(skip)
            .limit(pageSize)
            .lean()
        : User.find(q)
            .select("_id email shopName contactName canLogin listingOnlyAccount calculatorOnlyAccount createdAt lastLoginAt")
            .sort({ lastLoginAt: -1 })
            .lean(),
    ]);

    const emails = users.map((u) => u.email);
    const subs = await ShopSubscription.find({ ownerEmail: { $in: emails } })
      .populate("planId", "name slug planType")
      .lean();
    const subByEmail = Object.fromEntries(subs.map((s) => [s.ownerEmail, s]));

    let list = users.map((u) => {
      const s = subByEmail[u.email];
      const p = s?.planId;
      return {
        id: String(u._id),
        email: u.email,
        shopName: u.shopName || "",
        contactName: u.contactName || "",
        canLogin: u.canLogin !== false,
        listingOnlyAccount: !!u.listingOnlyAccount,
        calculatorOnlyAccount: !!u.calculatorOnlyAccount,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
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
    if (!useMongoSort) {
      const paged = sortAndPaginateAdminRows(list, { sortBy, sortDir }, page, pageSize);
      list = paged.items;
      return NextResponse.json({ users: list, page, pageSize, totalCount: paged.totalCount });
    }
    return NextResponse.json({ users: list, page, pageSize, totalCount });
  } catch (err) {
    console.error("Admin active clients list error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list active clients" },
      { status: 500 }
    );
  }
}
