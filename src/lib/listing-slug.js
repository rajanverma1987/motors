/**
 * Public listing URLs use urlSlug (company-based, unique), e.g. clearwater-electric-motor-repair-llc.
 * Legacy URLs ended with MongoDB ObjectId; getIdFromSlugParam still parses those for redirects.
 */

const ID_REGEX = /[a-f0-9]{24}$/i;

export function slugify(companyName) {
  if (!companyName || typeof companyName !== "string") return "";
  return companyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Full slug for URL: company-name-id
 */
export function getListingSlug(companyName, id) {
  const base = slugify(companyName);
  const safeId = (id || "").trim();
  if (!safeId) return base || "listing";
  return base ? `${base}-${safeId}` : safeId;
}

/**
 * Extract MongoDB ObjectId from the end of a slug param.
 */
export function getIdFromSlugParam(slug) {
  if (!slug || typeof slug !== "string") return null;
  const trimmed = slug.trim();
  const match = trimmed.match(ID_REGEX);
  return match ? match[0] : null;
}

/** Path segment for links to a public listing detail page. */
export function getListingPublicPathSegment(listing) {
  const s = listing?.urlSlug?.trim();
  if (s) return s;
  const id = listing?.id || listing?._id?.toString?.();
  const name = listing?.companyName;
  return getListingSlug(name, id);
}
