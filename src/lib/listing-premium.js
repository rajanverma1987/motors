/**
 * Shared public-directory sort: Premium Partner shops first, then profile score.
 * Use with Mongo `.sort(PUBLIC_LISTING_SORT)` and in-memory `comparePublicListings`.
 */
export const PUBLIC_LISTING_SORT = {
  isPremium: -1,
  directoryScore: -1,
  updatedAt: -1,
  companyName: 1,
};

/**
 * @param {{ isPremium?: boolean, directoryScore?: number, companyName?: string, updatedAt?: Date|string }} a
 * @param {{ isPremium?: boolean, directoryScore?: number, companyName?: string, updatedAt?: Date|string }} b
 */
export function comparePublicListings(a, b) {
  const premA = a?.isPremium ? 1 : 0;
  const premB = b?.isPremium ? 1 : 0;
  if (premB !== premA) return premB - premA;
  const scoreA = Number(a?.directoryScore) || 0;
  const scoreB = Number(b?.directoryScore) || 0;
  if (scoreB !== scoreA) return scoreB - scoreA;
  const tA = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const tB = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  if (tB !== tA) return tB - tA;
  return String(a?.companyName || "").localeCompare(String(b?.companyName || ""), undefined, {
    sensitivity: "base",
  });
}

/** Badge label for paying / promoted directory listings. */
export const PREMIUM_LISTING_BADGE_LABEL = "Premium Partner";
