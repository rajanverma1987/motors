import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";
import { hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import {
  trackFacilityToAdminJson,
  motorCountsByFacilityIds,
} from "@/lib/track-subscription";

export const dynamic = "force-dynamic";

const SORT_KEYS = [
  "facilityName",
  "contactName",
  "email",
  "phone",
  "country",
  "subscriptionStatus",
  "lastPaymentAt",
  "currentPeriodEndsAt",
  "lastLoginAt",
  "canLogin",
  "createdAt",
  "plan",
];

const SORT_FIELD_MAP = {
  lastPaidAt: "lastPaymentAt",
  nextDueAt: "currentPeriodEndsAt",
  subscriptionType: "subscriptionStatus",
  name: "contactName",
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
      q.$or = [
        { email: rx },
        { facilityName: rx },
        { contactName: rx },
        { phone: rx },
        { country: rx },
        { countryCode: rx },
      ];
    }
    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: [...SORT_KEYS, "lastPaidAt", "nextDueAt", "subscriptionType", "name"],
      defaultKey: "createdAt",
      defaultDir: "desc",
    });
    const mongoKey = SORT_FIELD_MAP[sortBy] || sortBy;
    const mongoSort = SORT_KEYS.includes(mongoKey)
      ? mongoSortFromAdmin(mongoKey, sortDir)
      : { createdAt: -1 };

    const [totalCount, rows] = await Promise.all([
      TrackFacility.countDocuments(q),
      TrackFacility.find(q)
        .select("-passwordHash")
        .sort(mongoSort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    const counts = await motorCountsByFacilityIds(rows.map((r) => r._id));
    const accounts = rows.map((row) =>
      trackFacilityToAdminJson(row, { motorCount: counts.get(String(row._id)) || 0 })
    );

    return NextResponse.json({
      accounts,
      page,
      pageSize,
      totalCount,
    });
  } catch (err) {
    console.error("GET admin track-facilities:", err);
    return NextResponse.json({ error: err.message || "Failed to load facilities" }, { status: 500 });
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
    const facilityName = clampString(body?.facilityName, 160);
    const contactName = clampString(body?.contactName ?? body?.name, LIMITS.name.max);
    const phone = clampString(body?.phone, 40);
    const country = clampString(body?.country, 80);
    const countryCode = String(body?.countryCode || "").trim().toUpperCase();

    if (!facilityName) {
      return NextResponse.json({ error: "Facility name is required." }, { status: 400 });
    }
    if (!contactName) {
      return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
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

    await connectDB();
    const existing = await TrackFacility.findOne({ email }).select("_id").lean();
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const facility = await TrackFacility.create({
      email,
      passwordHash: await hashPassword(password),
      facilityName,
      contactName,
      phone,
      country,
      countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : "",
      emailVerified: true,
      plan: "free",
      subscriptionStatus: "free",
    });

    const json = trackFacilityToAdminJson(facility.toObject(), { motorCount: 0 });
    return NextResponse.json({ account: json });
  } catch (err) {
    console.error("POST admin track-facilities:", err);
    return NextResponse.json({ error: err.message || "Failed to create facility" }, { status: 500 });
  }
}
