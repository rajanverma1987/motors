import { getPublicSiteUrl } from "@/lib/public-site-url";

/** Marketing site logo served from `public/logo-3phaseflow.png`. */
export const BRAND_LOGO_PUBLIC_PATH = "/logo-3phaseflow.png";

/** Intrinsic pixel size of the brand wordmark file (update if the file is replaced). */
export const BRAND_LOGO_WIDTH = 1330;
export const BRAND_LOGO_HEIGHT = 187;

/**
 * Absolute URL for email clients and JSON-LD (always https production host when env is localhost).
 * @param {import("next/server").NextRequest} [request]
 */
export function getBrandLogoAbsoluteUrl(request) {
  const base = String(getPublicSiteUrl(request) || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}${BRAND_LOGO_PUBLIC_PATH}`;
}
