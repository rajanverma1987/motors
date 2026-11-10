import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const LISTING_OWNER_EDIT_COOKIE = "listing_owner_edit";
export const LISTING_OWNER_EDIT_TYP = "listing_owner_edit";

const SESSION_SECONDS = 60 * 60 * 8;

function getSecret() {
  const secret = process.env.LISTING_EDIT_JWT_SECRET || process.env.JWT_SECRET || process.env.PORTAL_JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("JWT_SECRET must be set (32+ chars) in production");
  }
  return new TextEncoder().encode(secret || "motors-listing-edit-secret-change-in-production");
}

export async function createListingOwnerEditToken(listingId, email) {
  return new SignJWT({
    typ: LISTING_OWNER_EDIT_TYP,
    listingId: String(listingId),
    email: String(email || "")
      .trim()
      .toLowerCase(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyListingOwnerEditToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload?.typ !== LISTING_OWNER_EDIT_TYP) return null;
    const email = String(payload.email || "")
      .trim()
      .toLowerCase();
    const listingId = String(payload.listingId || "").trim();
    if (!email || !listingId) return null;
    return { email, listingId };
  } catch {
    return null;
  }
}

export function listingOwnerEditCookieOptions(maxAgeSeconds = SESSION_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getListingOwnerEditSession(request) {
  const cookieHeader = request?.headers?.get?.("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LISTING_OWNER_EDIT_COOKIE}=([^;]+)`));
  const fromHeader = match ? decodeURIComponent(match[1]) : "";
  let token = fromHeader;
  if (!token) {
    try {
      const jar = await cookies();
      token = jar.get(LISTING_OWNER_EDIT_COOKIE)?.value || "";
    } catch {
      token = "";
    }
  }
  if (!token) return null;
  return verifyListingOwnerEditToken(token);
}
