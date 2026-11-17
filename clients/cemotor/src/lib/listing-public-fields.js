/**
 * Field filtering for anything a Listing is exposed through publicly.
 *
 * Public listing responses used to spread the whole Mongo document, which handed out
 * the shop's login `email`, `phone`, `notificationEmails` and internal moderation
 * fields to any unauthenticated caller. Contact details are the directory's gated
 * asset (see /api/leads/contact-unlock) and moderation fields are nobody's business,
 * so every public path runs through toPublicListing.
 */

/** Never serialized to a public client or API response. */
export const LISTING_PRIVATE_FIELDS = [
  // Gated contact data — released only by the contact-unlock flow.
  "email",
  "notificationEmails",
  "phone",
  "primaryContactPerson",
  // Internal moderation / ownership.
  "reviewedBy",
  "reviewedAt",
  "submittedAt",
  "rejectionReason",
  "isSeed",
  "crmUserId",
  "crmOnboardedAt",
  "tenantSlug",
  "directoryScore",
  // Mongo internals.
  "__v",
  "password",
  "passwordHash",
];

/**
 * Contact fields the unlock flow releases. `website` is deliberately absent: it is the
 * shop's own public URL, stays a public prop on the page, and is not worth gating.
 */
export const LISTING_CONTACT_FIELDS = ["phone", "email", "primaryContactPerson"];

/**
 * Strip private fields from a listing and normalise its id.
 *
 * Adds hasPhone / hasEmail booleans so a gated UI can decide whether to offer the
 * unlock without receiving the values themselves.
 *
 * @param {Record<string, unknown> | null | undefined} listing Lean Mongo doc or plain object.
 * @returns {Record<string, unknown> | null}
 */
export function toPublicListing(listing) {
  if (!listing || typeof listing !== "object") return null;
  const src = typeof listing.toObject === "function" ? listing.toObject() : listing;
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (key === "_id") continue;
    if (LISTING_PRIVATE_FIELDS.includes(key)) continue;
    out[key] = value;
  }
  const id = src.id ?? src._id;
  if (id != null) out.id = String(id);
  out.hasPhone = Boolean(String(src.phone ?? "").trim());
  out.hasEmail = Boolean(String(src.email ?? "").trim());
  return out;
}

/** @param {unknown[]} listings */
export function toPublicListings(listings) {
  if (!Array.isArray(listings)) return [];
  return listings.map((l) => toPublicListing(l)).filter(Boolean);
}

/**
 * The contact payload released after a successful unlock.
 * @param {Record<string, unknown> | null | undefined} listing
 */
export function toUnlockedContact(listing) {
  if (!listing || typeof listing !== "object") return {};
  const out = {};
  for (const key of LISTING_CONTACT_FIELDS) {
    const value = String(listing[key] ?? "").trim();
    if (value) out[key] = value;
  }
  return out;
}
