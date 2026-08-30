import { generateSecret, verifySync, generateURI } from "otplib";
import { SignJWT, jwtVerify } from "jose";
import { getAdminCookieName } from "@/lib/auth-admin";

export const ADMIN_PENDING_TOKEN_TYPE = "motors_admin_pending";
export const ADMIN_PENDING_COOKIE = "motors_admin_pending";

let _adminSecret = null;
function getAdminJwtSecret() {
  if (_adminSecret) return _adminSecret;
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  _adminSecret = new TextEncoder().encode(secret || "motors-admin-secret-change-in-production");
  return _adminSecret;
}

export function isAdminTotpEnabled() {
  return Boolean(String(process.env.ADMIN_TOTP_SECRET || "").trim());
}

export function verifyAdminTotpCode(code) {
  const secret = String(process.env.ADMIN_TOTP_SECRET || "").trim();
  if (!secret) return false;
  const token = String(code || "").replace(/\s/g, "");
  if (!/^\d{6,8}$/.test(token)) return false;
  try {
    return verifySync({ secret, token, epochTolerance: 1 });
  } catch {
    return false;
  }
}

export function buildAdminTotpUri(email, secret) {
  return generateURI({
    issuer: "IQMotorBase Admin",
    label: email,
    secret,
  });
}

export async function createAdminPendingToken(email, { rememberMe = false } = {}) {
  return new SignJWT({
    email,
    typ: ADMIN_PENDING_TOKEN_TYPE,
    rememberMe: !!rememberMe,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(getAdminJwtSecret());
}

export async function verifyAdminPendingToken(token) {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecret());
    if (payload?.typ !== ADMIN_PENDING_TOKEN_TYPE) return null;
    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    if (!email) return null;
    return { email, rememberMe: !!payload.rememberMe };
  } catch {
    return null;
  }
}

export function getAdminPendingFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${ADMIN_PENDING_COOKIE}=([^;]+)`));
  const token = match ? match[1] : null;
  return token ? verifyAdminPendingToken(token) : Promise.resolve(null);
}

/** Issue full admin session cookie options after password + optional TOTP. */
export function getAdminSessionCookieOptions({ rememberMe = false } = {}) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: rememberMe ? 60 * 60 * 24 * 90 : 60 * 60 * 24 * 7,
    path: "/",
  };
}

export function getAdminPendingCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 5,
    path: "/",
  };
}

export { getAdminCookieName };
