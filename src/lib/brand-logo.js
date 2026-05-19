import { getPublicSiteUrl } from "@/lib/public-site-url";

/** Marketing site logo served from `public/logo.png`. */
export const BRAND_LOGO_PUBLIC_PATH = "/logo.png";

/** Intrinsic pixel size of `public/logo.png` (update if the file is replaced). */
export const BRAND_LOGO_WIDTH = 1363;
export const BRAND_LOGO_HEIGHT = 183;

/**
 * Absolute URL for email clients and JSON-LD (always https production host when env is localhost).
 * @param {import("next/server").NextRequest} [request]
 */
export function getBrandLogoAbsoluteUrl(request) {
  const base = String(getPublicSiteUrl(request) || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}${BRAND_LOGO_PUBLIC_PATH}`;
}
