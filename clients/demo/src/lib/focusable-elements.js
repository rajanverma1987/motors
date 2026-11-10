/**
 * Shared focusable-element helpers for Tab order (modals, custom selects).
 * Native disabled controls are excluded; also skip aria-disabled and inert/hidden.
 */

export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * @param {Element | null | undefined} el
 * @returns {boolean}
 */
export function isElementTabbable(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.closest("[inert]") != null) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.closest('[aria-hidden="true"]') != null) return false;

  // Disabled form controls / custom aria-disabled (even if tabindex is set).
  if (typeof el.matches === "function" && el.matches(":disabled")) return false;
  if (el.hasAttribute("disabled")) return false;
  if (el.getAttribute("aria-disabled") === "true") return false;
  if (el.closest("fieldset[disabled]") != null) return false;
  // Ancestor with disabled attr (e.g. wrapping control) — exclude nested focus targets.
  const disabledAncestor = el.closest("[disabled]");
  if (disabledAncestor && disabledAncestor !== el) return false;

  if (el.getAttribute("tabindex") === "-1") return false;

  if (typeof window === "undefined") return true;
  const style = window.getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  if (el.offsetParent === null && style.position !== "fixed" && style.position !== "sticky") {
    return false;
  }
  return true;
}

/**
 * @param {ParentNode | null | undefined} container
 * @returns {HTMLElement[]}
 */
export function getFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== "function") return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isElementTabbable);
}
