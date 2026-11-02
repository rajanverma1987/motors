/** Dashboard UI zoom (product-only; applied on signed-in dashboard routes). */

export const DISPLAY_ZOOM_DEFAULT = 100;
export const DISPLAY_ZOOM_MIN = 75;
export const DISPLAY_ZOOM_MAX = 150;
export const DISPLAY_ZOOM_STEP = 5;

/** @param {unknown} raw */
export function normalizeZoomLevel(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DISPLAY_ZOOM_DEFAULT;
  const stepped = Math.round(n / DISPLAY_ZOOM_STEP) * DISPLAY_ZOOM_STEP;
  return Math.min(DISPLAY_ZOOM_MAX, Math.max(DISPLAY_ZOOM_MIN, stepped));
}

/** @returns {{ value: string, label: string }[]} */
export function displayZoomLevelSelectOptions() {
  const options = [];
  for (let z = DISPLAY_ZOOM_MIN; z <= DISPLAY_ZOOM_MAX; z += DISPLAY_ZOOM_STEP) {
    options.push({
      value: String(z),
      label: z === DISPLAY_ZOOM_DEFAULT ? `${z}% (default)` : `${z}%`,
    });
  }
  return options;
}

/** CSS zoom factor (1 = 100%). */
export function zoomLevelToFactor(level) {
  return normalizeZoomLevel(level) / 100;
}
