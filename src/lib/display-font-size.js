/** Dashboard base font scale (product-only; scales rem-based UI via html font-size). */

export const DISPLAY_FONT_SIZE_DEFAULT = 100;
export const DISPLAY_FONT_SIZE_MIN = 75;
export const DISPLAY_FONT_SIZE_MAX = 150;
export const DISPLAY_FONT_SIZE_STEP = 5;

/** @param {unknown} raw */
export function normalizeFontSizeLevel(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DISPLAY_FONT_SIZE_DEFAULT;
  const stepped = Math.round(n / DISPLAY_FONT_SIZE_STEP) * DISPLAY_FONT_SIZE_STEP;
  return Math.min(DISPLAY_FONT_SIZE_MAX, Math.max(DISPLAY_FONT_SIZE_MIN, stepped));
}

/** @returns {{ value: string, label: string }[]} */
export function displayFontSizeLevelSelectOptions() {
  const options = [];
  for (let z = DISPLAY_FONT_SIZE_MIN; z <= DISPLAY_FONT_SIZE_MAX; z += DISPLAY_FONT_SIZE_STEP) {
    options.push({
      value: String(z),
      label: z === DISPLAY_FONT_SIZE_DEFAULT ? `${z}% (default)` : `${z}%`,
    });
  }
  return options;
}

/** CSS font-scale factor (1 = 100%). */
export function fontSizeLevelToFactor(level) {
  return normalizeFontSizeLevel(level) / 100;
}
