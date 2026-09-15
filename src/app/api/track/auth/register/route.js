import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { hashPassword, createTrackToken } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { LIMITS, clampString, isValidEmail } from "@/lib/validation";
import { trackSessionPayload } from "@/lib/track-auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "track-register", 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const facilityName = clampString(body?.facilityName, 160);
    const contactName = clampString(body?.contactName, LIMITS.name.max);
    const phone = clampString(body?.phone, 40);
    const address = clampString(body?.address, 240);
    const city = clampString(body?.city, 80);
    const state = clampString(body?.state, 80);
    const postalCode = clampString(body?.postalCode, 30);
    const country = clampString(body?.country, 80);
    const countryCode = String(body?.countryCode || "").trim().toUpperCase();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < LIMITS.password.min) {
      return NextResponse.json(
        { error: `Password must be at least ${LIMITS.password.min} characters.` },
        { status: 400 }
      );
    }
    const passwordError = getPasswordPolicyError(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    if (!facilityName) {
      return NextResponse.json({ error: "Facility name is required." }, { status: 400 });
    }
    if (!contactName) {
      return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
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
      address,
      city,
      state,
      postalCode,
      country,
      countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : "",
      emailVerified: true,
      plan: "free",
      subscriptionStatus: "free",
      lastLoginAt: new Date(),
    });

    const token = await createTrackToken({
      facilityId: facility._id.toString(),
      email: facility.email,
      contactName: facility.contactName,
    });
    const session = await trackSessionPayload(facility);
    return NextResponse.json({ ok: true, token, session });
  } catch (err) {
    console.error("Track register:", err);
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
