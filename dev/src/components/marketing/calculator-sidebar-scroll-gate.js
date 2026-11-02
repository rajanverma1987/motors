"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Applies `scrollableClassName` (max-height + overflow-y) only after the sentinel
 * has scrolled above `activateBelowTopPx` from the viewport top. Until then, uses
 * `idleClassName` so the document keeps wheel/scroll priority while the hero / top
 * of the page is still in play.
 */
export default function CalculatorSidebarScrollGate({
  children,
  sentinelId,
  /** When the sentinel's top edge is above this (px from viewport top), inner scroll is on. */
  activateBelowTopPx = 88,
  scrollableClassName,
  idleClassName = "min-h-0 overflow-x-hidden overflow-y-visible",
}) {
  const [innerScroll, setInnerScroll] = useState(false);

  const update = useCallback(() => {
    const el = typeof document !== "undefined" ? document.getElementById(sentinelId) : null;
    if (!el) {
      setInnerScroll(false);
      return;
    }
    const top = el.getBoundingClientRect().top;
    setInnerScroll(top < activateBelowTopPx);
  }, [sentinelId, activateBelowTopPx]);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [update]);

  return <div className={innerScroll ? scrollableClassName : idleClassName}>{children}</div>;
}
