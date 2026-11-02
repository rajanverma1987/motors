/**
 * Reset accidental mobile browser zoom after the soft keyboard closes.
 * iOS Safari / installed PWAs often leave scale > 1 when an input blurs.
 */
export function restoreMobileViewportZoom() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    try {
      window.scrollTo(0, window.scrollY || 0);
    } catch {
      /* ignore */
    }
    return;
  }

  if (meta.dataset.zoomRestore === "1") return;
  meta.dataset.zoomRestore = "1";

  const prev = meta.getAttribute("content") || "width=device-width, initial-scale=1";
  const locked = /maximum-scale\s*=/i.test(prev)
    ? prev.replace(/maximum-scale\s*=\s*[^,\s]+/i, "maximum-scale=1")
    : `${prev.replace(/,\s*$/, "")}, maximum-scale=1`;

  meta.setAttribute("content", locked);

  const finish = () => {
    meta.setAttribute("content", prev);
    delete meta.dataset.zoomRestore;
    try {
      window.scrollTo(0, window.scrollY || 0);
    } catch {
      /* ignore */
    }
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(finish);
    });
  } else {
    setTimeout(finish, 0);
  }
}

function isEditableTarget(el) {
  if (!el || el === document.body || el === document.documentElement) return false;
  const tag = String(el.tagName || "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

/**
 * When the last form field loses focus on a phone viewport, restore default zoom.
 * Call from a client effect; returns a cleanup function.
 * @returns {() => void}
 */
export function attachMobileKeyboardZoomRestore() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  let blurTimer = 0;
  let lastVvHeight =
    typeof window.visualViewport !== "undefined" && window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight;

  const scheduleRestore = () => {
    window.clearTimeout(blurTimer);
    blurTimer = window.setTimeout(() => {
      if (isEditableTarget(document.activeElement)) return;
      restoreMobileViewportZoom();
    }, 180);
  };

  const onFocusOut = (event) => {
    if (!isEditableTarget(event.target)) return;
    scheduleRestore();
  };

  const onVvResize = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    const next = vv.height;
    // Keyboard closing: visual viewport grows again
    if (next > lastVvHeight + 40 && !isEditableTarget(document.activeElement)) {
      scheduleRestore();
    }
    lastVvHeight = next;
  };

  document.addEventListener("focusout", onFocusOut, true);
  window.visualViewport?.addEventListener("resize", onVvResize);

  return () => {
    window.clearTimeout(blurTimer);
    document.removeEventListener("focusout", onFocusOut, true);
    window.visualViewport?.removeEventListener("resize", onVvResize);
  };
}
