import { DISPLAY_ZOOM_DEFAULT, normalizeZoomLevel } from "@/lib/display-zoom";

/**
 * Apply dashboard UI zoom via --app-zoom-factor (see globals.css html font-size).
 * We intentionally avoid CSS `zoom` on &lt;html&gt; — it breaks position:fixed overlays
 * (Select dropdowns, action menus) that use getBoundingClientRect + portal to body.
 */
export function applyDashboardZoom(level) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const normalized = normalizeZoomLevel(level);
  const factor = normalized / DISPLAY_ZOOM_DEFAULT;

  if (factor === 1) {
    clearDashboardZoom();
    return;
  }

  root.setAttribute("data-app-zoom", String(normalized));
  root.style.zoom = "";
  root.style.setProperty("--app-zoom-factor", String(factor));
}

/** Remove dashboard zoom (e.g. when leaving signed-in app shell). */
export function clearDashboardZoom() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.zoom = "";
  root.style.removeProperty("--app-zoom-factor");
  root.removeAttribute("data-app-zoom");
}

/**
 * Current dashboard zoom factor (1 = 100%). Used when positioning fixed portaled UI.
 */
export function getDashboardZoomFactor() {
  if (typeof document === "undefined") return 1;
  const root = document.documentElement;
  const fromVar = parseFloat(getComputedStyle(root).getPropertyValue("--app-zoom-factor"));
  if (Number.isFinite(fromVar) && fromVar > 0) return fromVar;
  const fromZoom = parseFloat(getComputedStyle(root).zoom);
  if (Number.isFinite(fromZoom) && fromZoom > 0) return fromZoom;
  return 1;
}

/**
 * Map a trigger's getBoundingClientRect for position:fixed on document.body.
 * Only needed if CSS zoom is on an ancestor; kept for safety.
 * @param {DOMRect} rect
 */
export function mapRectForBodyFixedPosition(rect) {
  const factor = getDashboardZoomFactor();
  const usesCssZoom =
    typeof document !== "undefined" &&
    (parseFloat(document.documentElement.style.zoom) > 0 ||
      (parseFloat(getComputedStyle(document.documentElement).zoom) > 0 &&
        parseFloat(getComputedStyle(document.documentElement).zoom) !== 1));

  if (!usesCssZoom || factor === 1) {
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      bottom: rect.bottom,
      right: rect.right,
    };
  }

  return {
    top: rect.top / factor,
    left: rect.left / factor,
    width: rect.width / factor,
    bottom: rect.bottom / factor,
    right: rect.right / factor,
  };
}
