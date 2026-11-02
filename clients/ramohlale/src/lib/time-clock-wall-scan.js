import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "motors_time_clock_wall";
const TYP = "motors_time_clock_wall";
/** How long a wall QR open unlocks punching. */
export const WALL_SCAN_TTL_SECONDS = 5 * 60;

let _secret = null;
function getSecret() {
  if (_secret) return _secret;
  const secret = process.env.JWT_SECRET || process.env.PORTAL_JWT_SECRET;
  _secret = new TextEncoder().encode(secret || "motors-portal-secret-change-in-production");
  return _secret;
}

export function getTimeClockWallScanCookieName() {
  return COOKIE_NAME;
}

export function timeClockWallScanCookieOptions(maxAge = WALL_SCAN_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function clearTimeClockWallScanCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}

export async function createTimeClockWallScanToken(timeClockToken) {
  return new SignJWT({
    typ: TYP,
    timeClockToken: String(timeClockToken || "").trim(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${WALL_SCAN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyTimeClockWallScanToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload || payload.typ !== TYP) return null;
    if (!payload.timeClockToken) return null;
    return {
      timeClockToken: String(payload.timeClockToken).trim(),
    };
  } catch {
    return null;
  }
}

export async function getTimeClockWallScanFromRequest(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifyTimeClockWallScanToken(decodeURIComponent(match[1]));
}

/**
 * True when this request carries a valid wall-scan cookie for the shop token.
 */
export async function hasValidWallScan(request, timeClockToken) {
  const scan = await getTimeClockWallScanFromRequest(request);
  if (!scan) return false;
  return scan.timeClockToken === String(timeClockToken || "").trim();
}
