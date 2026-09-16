import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth-portal";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { LIMITS, isValidEmail } from "@/lib/validation";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendTrackPasswordResetEmail } from "@/lib/email";
import {
  hashTrackAccountToken,
  isTrackTokenLive,
  issueTrackPasswordReset,
} from "@/lib/track-account-tokens";

export const dynamic = "force-dynamic";

/** Request a reset link. Always answers ok so the endpoint cannot enumerate accounts. */
export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "track-password-forgot", 6);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    await connectDB();
    const facility = await TrackFacility.findOne({ email });
    if (facility && facility.canLogin !== false) {
      const token = issueTrackPasswordReset(facility);
      await facility.save();
      const base = String(getPublicSiteUrl(request) || "").replace(/\/+$/, "");
      try {
        await sendTrackPasswordResetEmail({
          to: facility.email,
          contactName: facility.contactName,
          resetUrl: `${base}/Track?reset=${encodeURIComponent(token)}`,
        });
      } catch (mailErr) {
        console.warn("Track reset email failed:", mailErr?.message || mailErr);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track password reset request:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/** Complete a reset with the single-use token. */
export async function PUT(request) {
  const { allowed } = await checkRateLimit(request, "track-password-reset", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");
    if (!token) return NextResponse.json({ error: "That reset link is not valid." }, { status: 400 });
    if (password.length < LIMITS.password.min) {
      return NextResponse.json(
        { error: `Password must be at least ${LIMITS.password.min} characters.` },
        { status: 400 }
      );
    }
    const policyError = getPasswordPolicyError(password);
    if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });

    await connectDB();
    const facility = await TrackFacility.findOne({
      passwordResetTokenHash: hashTrackAccountToken(token),
    });
    if (!facility || !isTrackTokenLive(facility.passwordResetExpiresAt)) {
      return NextResponse.json(
        { error: "That reset link has expired or was already used. Request a new one." },
        { status: 410 }
      );
    }

    facility.passwordHash = await hashPassword(password);
    facility.passwordResetTokenHash = "";
    facility.passwordResetExpiresAt = null;
    await facility.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track password reset:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
