import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminToken, getAdminCookieName } from "@/lib/auth-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordSecurityEvent } from "@/lib/security-audit";
import {
  ADMIN_PENDING_COOKIE,
  getAdminPendingFromRequest,
  getAdminSessionCookieOptions,
  isAdminTotpEnabled,
  verifyAdminTotpCode,
} from "@/lib/auth-admin-totp";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "admin-totp", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  if (!isAdminTotpEnabled()) {
    return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
  }

  try {
    const pending = await getAdminPendingFromRequest(request);
    if (!pending?.email) {
      return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
    }
    const pendingEmail = pending.email;
    const rememberMe = pending.rememberMe === true;

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : "";
    if (!verifyAdminTotpCode(code)) {
      await recordSecurityEvent({
        event: "admin_login_fail",
        request,
        actorEmail: pendingEmail,
        success: false,
        metadata: { reason: "invalid_totp" },
      });
      return NextResponse.json({ error: "Invalid authentication code." }, { status: 401 });
    }

    const token = await createAdminToken(pendingEmail, { rememberMe });
    const cookieStore = await cookies();
    cookieStore.set(getAdminCookieName(), token, getAdminSessionCookieOptions({ rememberMe }));
    cookieStore.delete(ADMIN_PENDING_COOKIE);

    await recordSecurityEvent({
      event: "admin_login_success",
      request,
      actorEmail: pendingEmail,
      success: true,
      metadata: { totp: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin TOTP verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
