import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/auth-portal";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { LIMITS, isValidEmail } from "@/lib/validation";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  buildPortalResetUrl,
  hashPortalResetToken,
  isPortalResetTokenLive,
  issuePortalPasswordReset,
} from "@/lib/portal-password-reset";

export const dynamic = "force-dynamic";

async function requestPlatformResetEmail({ to, contactName, shopName, resetUrl }) {
  const base = String(process.env.PLATFORM_API_BASE || "").replace(/\/$/, "");
  const tenantKey = String(process.env.PLATFORM_TENANT_KEY || "").trim();
  const slug = String(process.env.TENANT_SLUG || "cemotor").trim().toLowerCase();
  if (!base || !tenantKey) {
    return { ok: false, error: "PLATFORM_API_BASE / PLATFORM_TENANT_KEY not configured" };
  }
  const res = await fetch(`${base}/api/platform/password-reset-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantKey}`,
      "x-tenant-slug": slug,
    },
    body: JSON.stringify({ to, contactName, shopName, resetUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || `Platform mail failed (${res.status})` };
  }
  return { ok: true };
}

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
      const token = issuePortalPasswordReset(user);
      await user.save();
      const site = String(getPublicSiteUrl(request) || "").replace(/\/+$/, "");
      const resetUrl = buildPortalResetUrl(site, token);
      try {
        const mail = await requestPlatformResetEmail({
          to: user.email,
          contactName: user.contactName,
          shopName: user.shopName,
          resetUrl,
        });
        if (!mail.ok) {
          console.warn("Portal reset email via platform failed:", mail.error);
        }
      } catch (mailErr) {
        console.warn("Portal reset email via platform failed:", mailErr?.message || mailErr);
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
