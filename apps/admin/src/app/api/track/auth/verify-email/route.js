import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendTrackVerifyEmail } from "@/lib/email";
import { getTrackFacilityFromRequest, trackSessionPayload, trackUnauthorized } from "@/lib/track-auth";
import {
  hashTrackAccountToken,
  isTrackTokenLive,
  issueTrackEmailVerification,
} from "@/lib/track-account-tokens";

export const dynamic = "force-dynamic";

/** Confirm an email address with either the link token or the 6 digit code. */
export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "track-verify-email", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const code = String(body?.code || "").trim();
    await connectDB();

    let facility = null;
    if (token) {
      facility = await TrackFacility.findOne({ emailVerifyTokenHash: hashTrackAccountToken(token) });
    } else if (code) {
      const authed = await getTrackFacilityFromRequest(request);
      if (!authed) return NextResponse.json(trackUnauthorized(), { status: 401 });
      facility = await TrackFacility.findById(authed._id);
      if (facility && String(facility.emailVerifyCode || "") !== code) facility = null;
    }

    if (!facility) {
      return NextResponse.json({ error: "That verification link or code is not valid." }, { status: 400 });
    }
    if (!facility.emailVerified && !isTrackTokenLive(facility.emailVerifyExpiresAt)) {
      return NextResponse.json(
        { error: "That verification link has expired. Send yourself a new one." },
        { status: 410 }
      );
    }

    facility.emailVerified = true;
    facility.emailVerifyCode = "";
    facility.emailVerifyTokenHash = "";
    facility.emailVerifyExpiresAt = null;
    await facility.save();

    return NextResponse.json({ ok: true, session: await trackSessionPayload(facility) });
  } catch (err) {
    console.error("Track verify email:", err);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}

/** Resend the verification email to the signed in facility. */
export async function PUT(request) {
  const { allowed } = await checkRateLimit(request, "track-verify-resend", 5);
  if (!allowed) {
    return NextResponse.json({ error: "Please wait before requesting another email." }, { status: 429 });
  }
  try {
    const authed = await getTrackFacilityFromRequest(request);
    if (!authed) return NextResponse.json(trackUnauthorized(), { status: 401 });
    await connectDB();
    const facility = await TrackFacility.findById(authed._id);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    if (facility.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const { token, code } = issueTrackEmailVerification(facility);
    await facility.save();
    const base = String(getPublicSiteUrl(request) || "").replace(/\/+$/, "");
    const result = await sendTrackVerifyEmail({
      to: facility.email,
      contactName: facility.contactName,
      verifyUrl: `${base}/Track?verify=${encodeURIComponent(token)}`,
      code,
    });
    if (result?.ok === false) {
      return NextResponse.json({ error: "Could not send the email. Try again shortly." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track verify resend:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
