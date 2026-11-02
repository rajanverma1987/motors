import crypto from "crypto";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const UNSUB_SECRET =
  process.env.TALENT_UNSUBSCRIBE_SECRET ||
  process.env.MARKETING_UNSUBSCRIBE_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET;

export function getTalentUnsubscribeToken(email) {
  if (!UNSUB_SECRET) return "";
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  return crypto.createHmac("sha256", UNSUB_SECRET).update(`talent:${normalized}`).digest("base64url");
}

export function buildTalentUnsubscribeUrl(email, request) {
  const baseUrl = getPublicSiteUrl(request);
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  const token = getTalentUnsubscribeToken(normalized);
  return `${baseUrl}/api/talent/unsubscribe?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`;
}

export function verifyTalentUnsubscribeToken(email, token) {
  if (!UNSUB_SECRET) return true;
  const expected = getTalentUnsubscribeToken(email);
  if (!expected || !token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(String(token)), Buffer.from(String(expected)));
  } catch {
    return false;
  }
}
