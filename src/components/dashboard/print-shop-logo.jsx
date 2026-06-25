"use client";

/**
 * Shop logo sizing for all printable documents (invoice, quote, PO, repair-flow quotes, public links).
 */
export const PRINT_SHOP_LOGO_IMG_CLASS =
  "h-[5rem] max-h-[5rem] w-auto max-w-[17rem] shrink-0 object-contain object-left print:block";

/**
 * @param {{ logoUrl?: string|null, alt?: string, className?: string }} props
 */
export function PrintShopLogo({ logoUrl, alt = "", className = "" }) {
  const src = String(logoUrl || "").trim();
  if (!src) return null;
  const cls = [PRINT_SHOP_LOGO_IMG_CLASS, className].filter(Boolean).join(" ");
  return <img src={src} alt={alt} className={cls} />;
}
