import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { TALENT_COOKIE, TALENT_JWT_TYP } from "@/lib/talent-constants";
import { serializeTalentProfile } from "@/lib/talent-serialize";

export { serializeTalentProfile };

function getTalentSecret() {
  const secret = process.env.TALENT_JWT_SECRET || process.env.JWT_SECRET || process.env.PORTAL_JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("TALENT_JWT_SECRET or JWT_SECRET must be set (32+ chars) in production");
  }
  return new TextEncoder().encode(secret || "motors-talent-secret-change-in-production");
}

export async function createTalentToken(profileId, email) {
  return new SignJWT({
    typ: TALENT_JWT_TYP,
    profileId: String(profileId),
    email: String(email || "")
      .trim()
      .toLowerCase(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getTalentSecret());
}

export async function verifyTalentToken(token) {
  try {
    const { payload } = await jwtVerify(token, getTalentSecret());
    if (payload?.typ !== TALENT_JWT_TYP) return null;
    const email = String(payload.email || "")
      .trim()
      .toLowerCase();
    const profileId = String(payload.profileId || "").trim();
    if (!email || !profileId) return null;
    return { email, profileId };
  } catch {
    return null;
  }
}

export function talentCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getTalentSessionFromRequest(request) {
  const cookieHeader = request?.headers?.get?.("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TALENT_COOKIE}=([^;]+)`));
  const fromHeader = match ? decodeURIComponent(match[1]) : "";
  let token = fromHeader;
  if (!token) {
    try {
      const jar = await cookies();
      token = jar.get(TALENT_COOKIE)?.value || "";
    } catch {
      token = "";
    }
  }
  if (!token) return null;
  return verifyTalentToken(token);
}

export async function getTalentProfileFromRequest(request) {
  const session = await getTalentSessionFromRequest(request);
  if (!session?.profileId) return null;
  await connectDB();
  const doc = await JobSeekerProfile.findById(session.profileId).lean();
  if (!doc) return null;
  if (doc.status === "banned") return null;
  return doc;
}

