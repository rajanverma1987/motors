"use client";

import { useEffect } from "react";

const SW_URL = "/sw.js";
/** Re-check for a new service worker while the app is open. */
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

function promptWaitingWorker(worker) {
  if (!worker) return;
  try {
    worker.postMessage({ type: "SKIP_WAITING" });
  } catch {
    /* ignore */
  }
}

/**
 * Registers the PWA service worker and keeps installed apps on the latest build:
 * - checks for updates on load, focus, and when returning from background
 * - activates waiting workers immediately
 * - reloads once when a new worker takes control (so new JS bundles load)
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    let intervalId = null;
    let registration = null;

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const watchInstalling = (worker) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state !== "installed") return;
        if (!navigator.serviceWorker.controller) return;
        promptWaitingWorker(worker);
      });
    };

    const checkForUpdates = () => {
      registration?.update().catch(() => {});
      if (registration?.waiting) {
        promptWaitingWorker(registration.waiting);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") checkForUpdates();
    };

    const onPageShow = (event) => {
      if (event.persisted) checkForUpdates();
    };

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(SW_URL, {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        return;
      }

      if (registration.waiting) {
        promptWaitingWorker(registration.waiting);
      }

      watchInstalling(registration.installing);
      registration.addEventListener("updatefound", () => {
        watchInstalling(registration.installing);
      });

      checkForUpdates();
      intervalId = window.setInterval(checkForUpdates, UPDATE_INTERVAL_MS);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("focus", checkForUpdates);
      window.addEventListener("pageshow", onPageShow);
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (intervalId != null) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", checkForUpdates);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
