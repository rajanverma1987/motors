import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createAdminToken, getAdminCookieName } from "@/lib/auth-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordSecurityEvent } from "@/lib/security-audit";
import {
  createAdminPendingToken,
  getAdminPendingCookieOptions,
  getAdminSessionCookieOptions,
  isAdminTotpEnabled,
} from "@/lib/auth-admin-totp";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "admin-login", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { email, password } = body || {};
    const rememberMe = body?.rememberMe === true;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || (!adminPassword && !adminPasswordHash)) {
      return NextResponse.json(
        { error: "Admin not configured" },
        { status: 500 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const emailNorm = String(email).trim().toLowerCase();
    if (emailNorm !== String(adminEmail).trim().toLowerCase()) {
      await recordSecurityEvent({
        event: "admin_login_fail",
        request,
        actorEmail: emailNorm,
        success: false,
        metadata: { reason: "invalid_email" },
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    let valid = false;
    if (adminPasswordHash) {
      valid = await bcrypt.compare(password, adminPasswordHash);
    } else if (adminPassword) {
      valid = password === adminPassword;
    }

    if (!valid) {
      await recordSecurityEvent({
        event: "admin_login_fail",
        request,
        actorEmail: emailNorm,
        success: false,
        metadata: { reason: "invalid_password" },
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    if (isAdminTotpEnabled()) {
      const pendingToken = await createAdminPendingToken(emailNorm, { rememberMe });
      cookieStore.set("motors_admin_pending", pendingToken, getAdminPendingCookieOptions());
      return NextResponse.json({ ok: true, requiresTotp: true });
    }

    const token = await createAdminToken(emailNorm, { rememberMe });
    cookieStore.set(getAdminCookieName(), token, getAdminSessionCookieOptions({ rememberMe }));
    cookieStore.delete("motors_admin_pending");

    await recordSecurityEvent({
      event: "admin_login_success",
      request,
      actorEmail: emailNorm,
      success: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
