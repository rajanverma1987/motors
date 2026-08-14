import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";
import { mobileAppAccountToAdminJson } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

const SORT_KEYS = [
  "name",
  "email",
  "phone",
  "subscriptionStatus",
  "lastPaymentAt",
  "currentPeriodEndsAt",
  "lastLoginAt",
  "canLogin",
  "createdAt",
];

const SORT_FIELD_MAP = {
  lastPaidAt: "lastPaymentAt",
  nextDueAt: "currentPeriodEndsAt",
  subscriptionType: "subscriptionStatus",
};

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
      q.$or = [{ email: rx }, { name: rx }, { phone: rx }];
    }
    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: [...SORT_KEYS, "lastPaidAt", "nextDueAt", "subscriptionType"],
      defaultKey: "createdAt",
      defaultDir: "desc",
    });
    const mongoKey = SORT_FIELD_MAP[sortBy] || sortBy;
    const mongoSort = SORT_KEYS.includes(mongoKey)
      ? mongoSortFromAdmin(mongoKey, sortDir)
      : { createdAt: -1 };

    const [totalCount, rows] = await Promise.all([
      MobileAppAccount.countDocuments(q),
      MobileAppAccount.find(q)
        .select("-passwordHash")
        .sort(mongoSort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    return NextResponse.json({
      accounts: rows.map(mobileAppAccountToAdminJson),
      page,
      pageSize,
      totalCount,
    });
  } catch (err) {
    console.error("GET admin mobile-app-accounts:", err);
    return NextResponse.json({ error: err.message || "Failed to load accounts" }, { status: 500 });
  }
}
