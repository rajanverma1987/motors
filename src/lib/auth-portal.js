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
const PORTAL_TIER_COOKIE = "motors_portal_tier";
const PORTAL_TIER_CALCULATOR_ONLY = "calculator_only";
const PORTAL_TIER_FULL = "full";

export function getPortalTierCookieName() {
  return PORTAL_TIER_COOKIE;
}

export function getPortalTokenFromCookieHeader(cookieHeader) {
  const match = (cookieHeader || "").match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

export function getPortalTierFromCookieHeader(cookieHeader) {
  const match = (cookieHeader || "").match(new RegExp(`${PORTAL_TIER_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function isCalculatorOnlyPortalTierCookie(tier) {
  return tier === PORTAL_TIER_CALCULATOR_ONLY;
}

export async function getPortalPayloadFromRequest(request) {
  const token = getPortalTokenFromCookieHeader(request.headers.get("cookie") || "");
  if (!token) return null;
  return verifyPortalToken(token);
}

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

export async function setPortalSessionCookies(cookieStore, { token, calculatorOnlyPortal }) {
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
  cookieStore.set(getPortalCookieName(), token, { ...common, maxAge: 60 * 60 * 24 * 7 });
  cookieStore.set(
    getPortalTierCookieName(),
    calculatorOnlyPortal ? PORTAL_TIER_CALCULATOR_ONLY : PORTAL_TIER_FULL,
    { ...common, maxAge: 60 * 60 * 24 * 7 }
  );
}

export function clearPortalSessionCookies(cookieStore) {
  cookieStore.delete(getPortalCookieName());
  cookieStore.delete(getPortalTierCookieName());
}

export async function getPortalUserFromRequest(request) {
  const payload = await getPortalPayloadFromRequest(request);
  if (!payload || !payload.email) return null;
  return {
    email: payload.email,
    shopName: payload.shopName || "",
    contactName: payload.contactName || "",
    calculatorOnlyPortal: payload.calculatorOnlyPortal === true,
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
