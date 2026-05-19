/**
 * Public listing URLs use urlSlug (company-based, unique), e.g. clearwater-electric-motor-repair-llc.
 * Legacy URLs ended with MongoDB ObjectId; getIdFromSlugParam still parses those for redirects.
 */

const ID_REGEX = /[a-f0-9]{24}$/i;

/** Max path segment length (Windows .next export paths; SEO-friendly cap). */
export const MAX_LISTING_URL_SLUG_LENGTH = 80;

export function slugify(text, maxLen = MAX_LISTING_URL_SLUG_LENGTH) {
  if (!text || typeof text !== "string") return "";
  let slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (maxLen > 0 && slug.length > maxLen) {
    slug = slug.slice(0, maxLen).replace(/-+$/g, "");
  }
  return slug;
}

/** First line / sentence of company name before slugify (avoids paragraph-length company fields). */
export function companyNameToUrlSlugBase(companyName) {
  if (!companyName || typeof companyName !== "string") return "";
  const firstLine = companyName.trim().split(/[\n\r|]/)[0].trim();
  const firstSentence = firstLine.split(/[.!?]/)[0].trim() || firstLine;
  const capped = firstSentence.length > 100 ? firstSentence.slice(0, 100) : firstSentence;
  return slugify(capped, MAX_LISTING_URL_SLUG_LENGTH);
}

/** Safe for Next.js static export on Windows (path length under .next/server/app/...). */
export function isListingUrlSlugExportSafe(slug) {
  if (!slug || typeof slug !== "string") return false;
  const s = slug.trim();
  if (!s || s.length > MAX_LISTING_URL_SLUG_LENGTH) return false;
  if (/[<>:"\\|?*\x00-\x1f]/.test(s)) return false;
  return true;
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
