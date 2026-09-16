/**
 * Whether a directory listing can respond to an IQMotorTrack RFQ inside the shop
 * portal, or only by the emailed no-login link (§9.7).
 *
 * A listing counts as having an account when `crmUserId` is linked by admin
 * onboarding, or when its contact email matches a registered portal user.
 */

import { buildEmailToCrmUserIdMap, resolveListingCrmUserId } from "@/lib/listing-crm";

/**
 * @param {{ _id?: unknown, crmUserId?: unknown, email?: string }[]} listings
 * @returns {Promise<Map<string, "in_app"|"email">>} keyed by listing id
 */
export async function trackRespondsByMap(listings) {
  const rows = Array.isArray(listings) ? listings : [];
  const emailMap = await buildEmailToCrmUserIdMap(rows.map((l) => l?.email));
  const out = new Map();
  for (const listing of rows) {
    const id = String(listing?._id || listing?.id || "");
    if (!id) continue;
    out.set(id, resolveListingCrmUserId(listing, emailMap) ? "in_app" : "email");
  }
  return out;
}

/**
 * @param {{ _id?: unknown, crmUserId?: unknown, email?: string }|null|undefined} listing
 * @returns {Promise<"in_app"|"email">}
 */
export async function trackRespondsBy(listing) {
  if (!listing) return "email";
  const map = await trackRespondsByMap([listing]);
  return map.get(String(listing._id || listing.id || "")) || "email";
}
