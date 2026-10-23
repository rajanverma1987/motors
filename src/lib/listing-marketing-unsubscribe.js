import crypto from "crypto";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const UNSUB_SECRET = process.env.MARKETING_UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET;

export function getListingMarketingUnsubscribeToken(email) {
  if (!UNSUB_SECRET) return "";
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  return crypto.createHmac("sha256", UNSUB_SECRET).update(normalized).digest("base64url");
}

export function buildListingMarketingUnsubscribeUrl(email, request) {
  const baseUrl = getPublicSiteUrl(request);
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  const token = getListingMarketingUnsubscribeToken(normalized);
  return `${baseUrl}/api/marketing/unsubscribe?email=${encodeURIComponent(normalized)}&token=${token}`;
}

export function verifyListingMarketingUnsubscribeToken(email, token) {
  if (!UNSUB_SECRET) return true;
  const expected = getListingMarketingUnsubscribeToken(email);
  if (!expected || !token) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(String(token)), Buffer.from(expected));
  } catch {
    return false;
  }
}
