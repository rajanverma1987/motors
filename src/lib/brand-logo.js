import { getPublicSiteUrl } from "@/lib/public-site-url";

/** Marketing site logo served from `public/logo.png`. */
export const BRAND_LOGO_PUBLIC_PATH = "/logo.png";

/**
 * Absolute URL for email clients and JSON-LD (always https production host when env is localhost).
 * @param {import("next/server").NextRequest} [request]
 */
export function getBrandLogoAbsoluteUrl(request) {
  const base = String(getPublicSiteUrl(request) || "").replace(/\/+$/, "");
  if (!base) return "";
  return `${base}${BRAND_LOGO_PUBLIC_PATH}`;
}
