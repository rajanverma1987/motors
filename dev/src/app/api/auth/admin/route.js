import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import AdminUser from "@/models/AdminUser";
import { createAdminToken, getAdminCookieName, verifyPassword } from "@/lib/auth-admin";
import { ADMIN_ROLE_OWNER, normalizeAdminRole } from "@/lib/admin-rbac";
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
    const emailNorm = String(email || "").trim().toLowerCase();

    if (!emailNorm || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    let valid = false;
    let role = ADMIN_ROLE_OWNER;

    // 1) DB AdminUser (invited operators)
    await dbConnect();
    const dbUser = await AdminUser.findOne({ email: emailNorm, canLogin: true }).lean();
    if (dbUser?.passwordHash) {
      valid = await verifyPassword(password, dbUser.passwordHash);
      role = normalizeAdminRole(dbUser.role);
      if (valid) {
        await AdminUser.updateOne({ _id: dbUser._id }, { $set: { lastLoginAt: new Date() } });
      }
    }

    // 2) Env bootstrap owner
    if (!valid) {
      const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
      if (adminEmail && emailNorm === adminEmail && (adminPassword || adminPasswordHash)) {
        if (adminPasswordHash) {
          valid = await bcrypt.compare(password, adminPasswordHash);
        } else {
          valid = password === adminPassword;
        }
        role = ADMIN_ROLE_OWNER;
      }
    }

    if (!valid) {
      await recordSecurityEvent({
        event: "admin_login_fail",
        request,
        actorEmail: emailNorm,
        success: false,
        metadata: { reason: "invalid_credentials" },
      });
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const cookieStore = await cookies();

    if (isAdminTotpEnabled() && role === ADMIN_ROLE_OWNER && !dbUser) {
      const pendingToken = await createAdminPendingToken(emailNorm, { rememberMe });
      cookieStore.set("motors_admin_pending", pendingToken, getAdminPendingCookieOptions());
      return NextResponse.json({ ok: true, requiresTotp: true });
    }

    const token = await createAdminToken(emailNorm, { rememberMe, role });
    cookieStore.set(getAdminCookieName(), token, getAdminSessionCookieOptions({ rememberMe }));
    cookieStore.delete("motors_admin_pending");

    await recordSecurityEvent({
      event: "admin_login_success",
      request,
      actorEmail: emailNorm,
      success: true,
      metadata: { role },
    });

    return NextResponse.json({ ok: true, role });
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
