import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "motors_time_clock";
const TYP = "motors_time_clock";

let _secret = null;
function getSecret() {
  if (_secret) return _secret;
  const secret = process.env.JWT_SECRET || process.env.PORTAL_JWT_SECRET;
  _secret = new TextEncoder().encode(secret || "motors-portal-secret-change-in-production");
  return _secret;
}

export function getTimeClockCookieName() {
  return COOKIE_NAME;
}

export function timeClockSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}

export async function createTimeClockSessionToken({
  shopEmail,
  employeeId,
  employeeName,
  timeClockToken,
}) {
  return new SignJWT({
    typ: TYP,
    shopEmail: String(shopEmail || "").trim().toLowerCase(),
    employeeId: String(employeeId || "").trim(),
    employeeName: String(employeeName || "").trim(),
    timeClockToken: String(timeClockToken || "").trim(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyTimeClockSessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload || payload.typ !== TYP) return null;
    if (!payload.shopEmail || !payload.employeeId || !payload.timeClockToken) return null;
    return {
      shopEmail: String(payload.shopEmail).trim().toLowerCase(),
      employeeId: String(payload.employeeId).trim(),
      employeeName: String(payload.employeeName || "").trim(),
      timeClockToken: String(payload.timeClockToken).trim(),
    };
  } catch {
    return null;
  }
}

export async function getTimeClockSessionFromRequest(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifyTimeClockSessionToken(decodeURIComponent(match[1]));
}
