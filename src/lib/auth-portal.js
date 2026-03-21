import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

let _portalSecret = null;
function getPortalJwtSecret() {
  if (_portalSecret) return _portalSecret;
  const secret = process.env.JWT_SECRET || process.env.PORTAL_JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("JWT_SECRET or PORTAL_JWT_SECRET must be set and at least 32 characters in production");
  }
  _portalSecret = new TextEncoder().encode(secret || "motors-portal-secret-change-in-production");
  return _portalSecret;
}
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
    .sign(getPortalJwtSecret());
}

export async function verifyPortalToken(token) {
  try {
    const { payload } = await jwtVerify(token, getPortalJwtSecret());
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

const TECH_JWT_TYP = "motors_technician";

/**
 * JWT for Motop Technician mobile app (Bearer). Not interchangeable with portal cookie tokens.
 */
export async function createTechnicianToken({ employeeId, shopEmail, name, employeeEmail }) {
  return new SignJWT({
    typ: TECH_JWT_TYP,
    employeeId: String(employeeId || ""),
    shopEmail: String(shopEmail || "").toLowerCase().trim(),
    name: String(name || ""),
    employeeEmail: String(employeeEmail || "").toLowerCase().trim(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getPortalJwtSecret());
}

export async function verifyTechnicianToken(token) {
  try {
    const { payload } = await jwtVerify(token, getPortalJwtSecret());
    if (payload.typ !== TECH_JWT_TYP) return null;
    const shopEmail = String(payload.shopEmail || "")
      .trim()
      .toLowerCase();
    const employeeId = String(payload.employeeId || "").trim();
    if (!shopEmail || !employeeId) return null;
    return {
      employeeId,
      shopEmail,
      name: String(payload.name || ""),
      employeeEmail: String(payload.employeeEmail || "").trim().toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Shop owner (User) must exist and have canLogin !== false, or employees cannot use the tech app.
 */
export async function isShopOwnerLoginAllowed(shopEmail) {
  const email = String(shopEmail || "").trim().toLowerCase();
  if (!email) return false;
  await connectDB();
  const owner = await User.findOne({ email }).select("canLogin").lean();
  if (!owner) return false;
  return owner.canLogin !== false;
}

export async function getTechnicianFromRequest(request) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : "";
  if (!token) return null;
  const tech = await verifyTechnicianToken(token);
  if (!tech) return null;
  const allowed = await isShopOwnerLoginAllowed(tech.shopEmail);
  if (!allowed) return null;
  return tech;
}
