import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

let _adminSecret = null;
function getAdminJwtSecret() {
  if (_adminSecret) return _adminSecret;
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("JWT_SECRET must be set and at least 32 characters in production");
  }
  _adminSecret = new TextEncoder().encode(secret || "motors-admin-secret-change-in-production");
  return _adminSecret;
}
const COOKIE_NAME = "motors_admin";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createAdminToken(email) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getAdminJwtSecret());
}

export async function verifyAdminToken(token) {
  try {
    const { payload } = await jwtVerify(token, getAdminJwtSecret());
    return payload.email;
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
