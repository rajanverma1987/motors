"use client";

import { useEffect, useState } from "react";
import { FiPlusSquare, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return Boolean(window.navigator.standalone);
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
}

export default function InstallBanner() {
  const [hidden, setHidden] = useState(true);
  const [deferred, setDeferred] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    setIos(isIos());
    setHidden(false);
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden) return null;

  return (
    <div className="border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-title">Install IQWireCalculator</p>
          <p className="mt-0.5 text-xs leading-relaxed text-secondary">
            {deferred
              ? "Add it to your home screen for a full-screen app."
              : ios
                ? "In Safari, tap Share, then Add to Home Screen."
                : "Open the browser menu and choose Install app or Add to Home Screen."}
          </p>
        </div>
        {deferred ? (
          <Button
            type="button"
            size="sm"
            onClick={async () => {
              deferred.prompt();
              await deferred.userChoice.catch(() => {});
              setDeferred(null);
              setHidden(true);
            }}
          >
            <FiPlusSquare className="h-4 w-4 shrink-0" aria-hidden />
            Install
          </Button>
        ) : null}
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="rounded-md p-1.5 text-secondary hover:bg-primary/10 hover:text-title"
          aria-label="Dismiss"
        >
          <FiX className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}
