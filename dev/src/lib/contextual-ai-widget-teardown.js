/**
 * Removes DOM/script injected by Contextual AI Systems widget.js (see cas-widget-* ids).
 * Used when leaving marketing routes and when mounting dashboard so the bubble cannot linger on SPA navigations or delayed script execution.
 */

const SCRIPT_ID = "contextual-ai-systems-widget";

export function teardownContextualAiWidgetDom() {
  if (typeof document === "undefined") return;

  document.getElementById("cas-widget-container")?.remove();
  document.getElementById("cas-widget-loading")?.remove();
  document.getElementById("cas-widget-animations")?.remove();
  document.getElementById("cas-widget-typing-style")?.remove();
  document.getElementById(SCRIPT_ID)?.remove();
  document.querySelectorAll('script[src*="contextualaisystems.com/widget.js"]').forEach((el) => {
    el.remove();
  });

  if (document.body) {
    document.body.style.overflow = "";
  }

  document.querySelectorAll("body > audio").forEach((el) => {
    try {
      if (!el.autoplay) return;
      const inlineHidden = el.style?.display === "none";
      const computedHidden =
        typeof getComputedStyle !== "undefined" && getComputedStyle(el).display === "none";
      if (inlineHidden || computedHidden) el.remove();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Widget loads asynchronously; teardown immediately on dashboard mount and a few times shortly after
 * so late injection after leaving marketing still gets stripped.
 */
export function scheduleTeardownContextualAiWidgetDom() {
  teardownContextualAiWidgetDom();
  if (typeof window === "undefined") return () => {};

  const ids = [0, 50, 150, 400, 1000].map((ms) =>
    window.setTimeout(() => teardownContextualAiWidgetDom(), ms)
  );

  return () => ids.forEach((id) => window.clearTimeout(id));
}
