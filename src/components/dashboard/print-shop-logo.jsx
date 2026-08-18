"use client";

import { useUserSettings } from "@/contexts/user-settings-context";
import { logoDocumentSizeRem, normalizeLogoDocumentScale } from "@/lib/logo-document-scale";

/**
 * Shop logo sizing for all printable documents (invoice, quote, PO, repair-flow quotes, public links).
 */
export const PRINT_SHOP_LOGO_IMG_CLASS =
  "w-auto shrink-0 object-contain object-left object-top print:block";

/**
 * @param {{ logoUrl?: string|null, alt?: string, className?: string, scale?: number, variant?: "default" | "lg" }} props
 */
export function PrintShopLogo({ logoUrl, alt = "", className = "", scale, variant = "default" }) {
  const { settings } = useUserSettings();
  const src = String(logoUrl || "").trim();
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
