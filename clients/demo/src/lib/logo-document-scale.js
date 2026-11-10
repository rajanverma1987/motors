/** Shop logo size on printed documents and customer/vendor emails. */

export const LOGO_DOCUMENT_SCALE_DEFAULT = 100;
export const LOGO_DOCUMENT_SCALE_MIN = 50;
export const LOGO_DOCUMENT_SCALE_MAX = 300;
export const LOGO_DOCUMENT_SCALE_STEP = 10;

/** Matches previous print logo: h-[2.75rem] max-w-[12rem] */
export const LOGO_DOCUMENT_HEIGHT_REM = 2.75;
export const LOGO_DOCUMENT_MAX_WIDTH_REM = 12;

/** Larger masthead (datasheets). */
export const LOGO_DOCUMENT_HEIGHT_REM_LG = 4.25;
export const LOGO_DOCUMENT_MAX_WIDTH_REM_LG = 16;

/** @param {unknown} raw */
export function normalizeLogoDocumentScale(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return LOGO_DOCUMENT_SCALE_DEFAULT;
  const stepped = Math.round(n / LOGO_DOCUMENT_SCALE_STEP) * LOGO_DOCUMENT_SCALE_STEP;
  return Math.min(LOGO_DOCUMENT_SCALE_MAX, Math.max(LOGO_DOCUMENT_SCALE_MIN, stepped));
}

/**
 * @param {unknown} scale
 * @param {"default" | "lg"} [variant]
 * @returns {{ heightRem: number, maxWidthRem: number }}
 */
export function logoDocumentSizeRem(scale, variant = "default") {
  const factor = normalizeLogoDocumentScale(scale) / 100;
  const heightBase = variant === "lg" ? LOGO_DOCUMENT_HEIGHT_REM_LG : LOGO_DOCUMENT_HEIGHT_REM;
  const widthBase = variant === "lg" ? LOGO_DOCUMENT_MAX_WIDTH_REM_LG : LOGO_DOCUMENT_MAX_WIDTH_REM;
  return {
    heightRem: Math.round(heightBase * factor * 100) / 100,
    maxWidthRem: Math.round(widthBase * factor * 100) / 100,
  };
}

/**
 * Pixel sizes for email HTML (16px root, same visual size as print rem).
 * @param {unknown} scale
 * @param {"default" | "lg"} [variant]
 * @returns {{ heightPx: number, maxWidthPx: number, style: string }}
 */
export function shopEmailLogoInlineStyle(scale, variant = "default") {
  const { heightRem, maxWidthRem } = logoDocumentSizeRem(scale, variant);
  const heightPx = Math.round(heightRem * 16);
  const maxWidthPx = Math.round(maxWidthRem * 16);
  return {
    heightPx,
    maxWidthPx,
    style: `height:${heightPx}px;max-height:${heightPx}px;width:auto;max-width:${maxWidthPx}px;display:block;border:0`,
  };
}
