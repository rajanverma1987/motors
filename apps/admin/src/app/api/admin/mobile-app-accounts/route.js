import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";
import { hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { mobileAppAccountToAdminJson, trialEndsAtFrom } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

const SORT_KEYS = [
  "name",
  "email",
  "phone",
  "country",
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
      q.$or = [{ email: rx }, { name: rx }, { phone: rx }, { country: rx }, { countryCode: rx }];
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

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const name = clampString(body?.name, LIMITS.name.max);
    const phone = clampString(body?.phone, 40);
    const country = clampString(body?.country, 80);
    const countryCode = String(body?.countryCode || "").trim().toUpperCase();
    const trialDaysRaw = body?.trialDays;

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (password.length < LIMITS.password.min || password.length > LIMITS.password.max) {
      return NextResponse.json(
        { error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.` },
        { status: 400 }
      );
    }
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
      return NextResponse.json({ error: "Country code must be 2 letters (e.g. US)." }, { status: 400 });
    }

    let trialEndsAt = trialEndsAtFrom(new Date());
    if (trialDaysRaw != null && String(trialDaysRaw).trim() !== "") {
      const n = Math.floor(Number(trialDaysRaw));
      if (!Number.isFinite(n) || n < 1 || n > 365) {
        return NextResponse.json({ error: "Trial days must be between 1 and 365." }, { status: 400 });
      }
      trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + n);
    }

    await connectDB();
    const existing = await MobileAppAccount.findOne({ email }).select("_id").lean();
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const now = new Date();
    const account = await MobileAppAccount.create({
      email,
      passwordHash: await hashPassword(password),
      name,
      phone,
      country,
      countryCode,
      trialStartedAt: now,
      trialEndsAt,
      subscriptionStatus: "trial",
    });

    const json = mobileAppAccountToAdminJson(account.toObject());
    return NextResponse.json({ account: json });
  } catch (err) {
    console.error("POST admin mobile-app-accounts:", err);
    return NextResponse.json({ error: err.message || "Failed to create account" }, { status: 500 });
  }
}
