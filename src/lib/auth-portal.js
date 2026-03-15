import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.PORTAL_JWT_SECRET || "motors-portal-secret-change-in-production"
);
const COOKIE_NAME = "motors_portal";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createPortalToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyPortalToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export function getPortalCookieName() {
  return COOKIE_NAME;
}

export async function getPortalUserFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match ? match[1] : null;
  if (!token) return null;
  const payload = await verifyPortalToken(token);
  if (!payload || !payload.email) return null;
  return {
    email: payload.email,
    shopName: payload.shopName || "",
    contactName: payload.contactName || "",
  };
}
