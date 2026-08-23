"use client";

import { useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";
import Button from "@/components/ui/button";

/**
 * Chromium / Android tablets: capture beforeinstallprompt and show Install.
 * iPad Safari: no beforeinstallprompt — show a short Share → Add to Home Screen hint instead.
 */
export default function PwaInstallButton({ className = "" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    const ua = window.navigator.userAgent || "";
    const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIos) setShowIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      // ignore
    }
    setDeferred(null);
  };

  if (deferred) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className={className}
        onClick={handleInstall}
        title="Install IQMotorBase on this device"
      >
        <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
        Install app
      </Button>
    );
  }

  if (showIosHint) {
    return (
      <p className={`max-w-[14rem] text-right text-xs leading-snug text-secondary ${className}`}>
        Install: Share → Add to Home Screen
      </p>
    );
  }

  return null;
}
