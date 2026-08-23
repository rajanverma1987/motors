"use client";

import { useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";
import Button from "@/components/ui/button";

function detectClient() {
  if (typeof window === "undefined") {
    return { isStandalone: false, isIos: false, isAndroid: false, isSamsungInternet: false, isChrome: false, isInsecureLan: false };
  }
  const ua = window.navigator.userAgent || "";
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isSamsungInternet = /SamsungBrowser/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR|SamsungBrowser/i.test(ua);
  const host = window.location.hostname || "";
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  const isInsecureLan =
    window.location.protocol === "http:" && !isLocalHost && (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith(".local"));
  return { isStandalone, isIos, isAndroid, isSamsungInternet, isChrome, isInsecureLan };
}

/**
 * Chromium / Android tablets: capture beforeinstallprompt and show Install.
 * Android Play Protect “Unsafe app blocked” is usually Samsung Internet’s old WebAPK
 * minting or HTTP LAN installs — guide users to HTTPS + Chrome.
 */
export default function PwaInstallButton({ className = "" }) {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [androidHint, setAndroidHint] = useState("");

  useEffect(() => {
    const { isStandalone, isIos, isAndroid, isSamsungInternet, isInsecureLan } = detectClient();
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

    if (isIos) setShowIosHint(true);
    if (isAndroid) {
      if (isInsecureLan) {
        setAndroidHint("Install from https://iqmotorbase.com in Chrome (HTTP LAN installs are blocked on Android).");
      } else if (isSamsungInternet) {
        setAndroidHint("Open this site in Chrome → menu → Install app (Samsung Internet is blocked by Play Protect).");
      }
    }

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
        title="Install IQMotorBase on this device (use Chrome on Android)"
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

  if (androidHint) {
    return (
      <p className={`max-w-[16rem] text-right text-xs leading-snug text-secondary ${className}`} title={androidHint}>
        {androidHint}
      </p>
    );
  }

  return null;
}
