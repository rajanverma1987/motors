"use client";

import { useUserSettings } from "@/contexts/user-settings-context";
import { logoDocumentSizeRem, normalizeLogoDocumentScale } from "@/lib/logo-document-scale";

/**
 * Shop logo sizing for all printable documents (invoice, quote, PO, repair-flow quotes, public links).
 */
export const PRINT_SHOP_LOGO_IMG_CLASS =
  "w-auto shrink-0 object-contain object-left object-top print:block";

/**
 * Rewrite stored /uploads/shop-settings/… paths to the disk-backed API route.
 * Branding preview already worked via API; documents on tablets were still hitting
 * static /uploads (often a cached miss). PreferApi kept for compatibility.
 */
export function resolveShopLogoDisplaySrc(logoUrl, { preferApi = true } = {}) {
  const raw = String(logoUrl || "").trim();
  if (!raw) return "";
  let pathname = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      pathname = new URL(raw).pathname || "";
    }
  } catch {
    pathname = raw.split("?")[0].split("#")[0];
  }
  pathname = pathname.split("?")[0].split("#")[0];
  const match = pathname.match(
    /^\/uploads\/shop-settings\/([a-f0-9]{24})\/(logo(?:-[a-zA-Z0-9]+)?\.(?:png|jpe?g|gif|webp))$/i
  );
  if (match && preferApi !== false) {
    return `/api/shop-settings-logo/${match[1]}/${match[2]}`;
  }
  return raw;
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
  preferApi = true,
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
