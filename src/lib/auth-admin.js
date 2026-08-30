import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const ADMIN_TOKEN_TYPE = "motors_admin";

let _adminSecret = null;
function getAdminJwtSecret() {
  if (_adminSecret) return _adminSecret;
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error(
      "ADMIN_JWT_SECRET (or JWT_SECRET) must be set and at least 32 characters in production"
    );
  }
  _adminSecret = new TextEncoder().encode(secret || "motors-admin-secret-change-in-production");
  return _adminSecret;
}

const COOKIE_NAME = "motors_admin";

function getConfiguredAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
}

function isPortalShapedPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return Boolean(
    payload.shopName ||
      payload.authType ||
      payload.employeeId ||
      payload.calculatorOnlyPortal != null
  );
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createAdminToken(email, { rememberMe = false } = {}) {
  const expiresIn = rememberMe ? "90d" : "7d";
  return new SignJWT({ email, typ: ADMIN_TOKEN_TYPE })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(getAdminJwtSecret());
}

export async function verifyAdminToken(token) {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecret());
    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    const adminEmail = getConfiguredAdminEmail();
    if (!email || !adminEmail || email !== adminEmail) {
      return null;
    }

    if (payload.typ === ADMIN_TOKEN_TYPE) {
      return email;
    }

    // Legacy admin tokens (email only, before typ claim) — reject portal-shaped JWTs.
    if (payload.typ && payload.typ !== ADMIN_TOKEN_TYPE) {
      return null;
    }
    if (isPortalShapedPayload(payload)) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function getAdminFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match ? match[1] : null;
  return token ? verifyAdminToken(token) : Promise.resolve(null);
}
