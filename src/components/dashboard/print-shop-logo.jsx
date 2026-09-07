"use client";

import { useUserSettings } from "@/contexts/user-settings-context";
import { logoDocumentSizeRem, normalizeLogoDocumentScale } from "@/lib/logo-document-scale";

/**
 * Shop logo sizing for all printable documents (invoice, quote, PO, repair-flow quotes, public links).
 */
export const PRINT_SHOP_LOGO_IMG_CLASS =
  "w-auto shrink-0 object-contain object-left object-top print:block";

/**
 * Prefer authenticated API for shop-settings logos in the dashboard so tablets
 * are not stuck on a year-long cached 404 for /uploads/.../logo.png.
 * Public / customer print URLs still use the stored path.
 */
export function resolveShopLogoDisplaySrc(logoUrl, { preferApi = false } = {}) {
  const src = String(logoUrl || "").trim();
  if (!src) return "";
  if (preferApi && src.includes("/uploads/shop-settings/")) {
    const rev = src.split("/").pop() || "1";
    return `/api/dashboard/settings/logo?v=${encodeURIComponent(rev)}`;
  }
  return src;
}

/**
 * @param {{ logoUrl?: string|null, alt?: string, className?: string, scale?: number, variant?: "default" | "lg", preferApi?: boolean }} props
 */
export function PrintShopLogo({
  logoUrl,
  alt = "",
  className = "",
  scale,
  variant = "default",
  preferApi = false,
}) {
  const { settings } = useUserSettings();
  const src = resolveShopLogoDisplaySrc(logoUrl, { preferApi });
  if (!src) return null;
  const resolvedScale = normalizeLogoDocumentScale(
    scale != null && scale !== "" ? scale : settings?.logoDocumentScale
  );
  const { heightRem, maxWidthRem } = logoDocumentSizeRem(resolvedScale, variant);
  const cls = [PRINT_SHOP_LOGO_IMG_CLASS, className].filter(Boolean).join(" ");
  return (
    <img
      src={src}
      alt={alt}
      className={cls}
      style={{
        height: `${heightRem}rem`,
        maxHeight: `${heightRem}rem`,
        maxWidth: `${maxWidthRem}rem`,
      }}
    />
  );
}
