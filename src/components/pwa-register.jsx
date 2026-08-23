"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (required for install prompts on Chromium).
 * Safe no-op when unsupported (e.g. older iOS Safari still gets Add to Home Screen via manifest + apple meta).
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Avoid SW during local HMR fights; still allow LAN tablet testing on :3000.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
