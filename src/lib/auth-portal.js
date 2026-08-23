import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { normalizePortalUi, PORTAL_UI_COOKIE, PORTAL_UI_SIMPLE } from "@/lib/portal-view";

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

export async function createPortalToken(payload, options = {}) {
  const expiresIn = options.expiresIn || (options.rememberMe ? "90d" : "7d");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
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

export function portalSessionCookieOptions({ rememberMe = false } = {}) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? 60 * 60 * 24 * 90 : 60 * 60 * 24 * 7,
  };
}

export function getPortalUiCookieName() {
  return PORTAL_UI_COOKIE;
}

export function setPortalUiCookie(cookieStore, portalUi, options = {}) {
  cookieStore.set(PORTAL_UI_COOKIE, normalizePortalUi(portalUi), portalSessionCookieOptions(options));
}

export async function setPortalSessionCookies(
  cookieStore,
  { token, calculatorOnlyPortal, portalUi, rememberMe = false }
) {
  const common = portalSessionCookieOptions({ rememberMe: !!rememberMe });
  cookieStore.set(getPortalCookieName(), token, common);
  cookieStore.set(
    getPortalTierCookieName(),
    calculatorOnlyPortal ? PORTAL_TIER_CALCULATOR_ONLY : PORTAL_TIER_FULL,
    common
  );
  setPortalUiCookie(cookieStore, calculatorOnlyPortal ? PORTAL_UI_SIMPLE : portalUi, {
    rememberMe: !!rememberMe,
  });
}

export function clearPortalSessionCookies(cookieStore) {
  cookieStore.delete(getPortalCookieName());
  cookieStore.delete(getPortalTierCookieName());
  cookieStore.delete(PORTAL_UI_COOKIE);
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

const MOBILE_APP_JWT_TYP = "motors_mobile_app";

/**
 * JWT for IQWireCalculator mobile app (Bearer). Not interchangeable with portal or technician tokens.
 */
export async function createMobileAppToken({ accountId, email, name }) {
  return new SignJWT({
    typ: MOBILE_APP_JWT_TYP,
    accountId: String(accountId || ""),
    email: String(email || "").toLowerCase().trim(),
    name: String(name || ""),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getPortalJwtSecret());
}

export async function verifyMobileAppToken(token) {
  try {
    const { payload } = await jwtVerify(token, getPortalJwtSecret());
    if (payload.typ !== MOBILE_APP_JWT_TYP) return null;
    const accountId = String(payload.accountId || "").trim();
    const email = String(payload.email || "")
      .trim()
      .toLowerCase();
    if (!accountId || !email) return null;
    return {
      accountId,
      email,
      name: String(payload.name || ""),
    };
  } catch {
    return null;
  }
}

export function getBearerTokenFromRequest(request) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}
