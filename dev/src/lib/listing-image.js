/**
 * Normalized path or full URL for listing images (logos / gallery).
 */
export function getListingImageSrc(url) {
  if (!url || typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return t.startsWith("/") ? t : `/${t}`;
}

export function isRemoteImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return /^https?:\/\//i.test(url.trim());
}
