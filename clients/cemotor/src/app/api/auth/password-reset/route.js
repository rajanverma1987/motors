import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth-portal";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { LIMITS, isValidEmail } from "@/lib/validation";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendPortalPasswordResetEmail } from "@/lib/email";
import { hasPlatformSmtp } from "@/lib/platform-smtp";
import {
  buildPortalResetUrl,
  hashPortalResetToken,
  isPortalResetTokenLive,
  issuePortalPasswordReset,
} from "@/lib/portal-password-reset";

export const dynamic = "force-dynamic";

/** Request a reset link. Always answers ok so the endpoint cannot enumerate accounts. */
export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "portal-password-forgot", 6);
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
    const user = await User.findOne({ email });
    if (user && user.canLogin !== false) {
      if (!hasPlatformSmtp()) {
        console.error("Portal password reset: platform SMTP not configured");
      } else {
        const token = issuePortalPasswordReset(user);
        await user.save();
        const base = String(getPublicSiteUrl(request) || "").replace(/\/+$/, "");
        const resetUrl = buildPortalResetUrl(base, token);
        try {
          const mail = await sendPortalPasswordResetEmail({
            to: user.email,
            contactName: user.contactName,
            shopName: user.shopName,
            resetUrl,
          });
          if (!mail?.ok) {
            console.warn("Portal reset email failed:", mail?.error || "unknown");
          }
        } catch (mailErr) {
          console.warn("Portal reset email failed:", mailErr?.message || mailErr);
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Portal password reset request:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/** Complete a reset with the single-use token. */
export async function PUT(request) {
  const { allowed } = await checkRateLimit(request, "portal-password-reset", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");
    if (!token) {
      return NextResponse.json({ error: "That reset link is not valid." }, { status: 400 });
    }
    if (password.length < LIMITS.password.min) {
      return NextResponse.json(
        { error: `Password must be at least ${LIMITS.password.min} characters.` },
        { status: 400 }
      );
    }
    const policyError = getPasswordPolicyError(password);
    if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });

    await connectDB();
    const user = await User.findOne({
      passwordResetTokenHash: hashPortalResetToken(token),
    });
    if (!user || !isPortalResetTokenLive(user.passwordResetExpiresAt)) {
      return NextResponse.json(
        { error: "That reset link has expired or was already used. Request a new one." },
        { status: 410 }
      );
    }
    if (user.canLogin === false) {
      return NextResponse.json({ error: "This account cannot sign in." }, { status: 403 });
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetTokenHash = "";
    user.passwordResetExpiresAt = null;
    await user.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Portal password reset:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
