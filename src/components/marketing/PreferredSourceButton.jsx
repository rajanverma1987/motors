"use client";

import { useCallback, useEffect, useRef } from "react";
import { FiBookmark } from "react-icons/fi";

const PREFERRED_SOURCE_DEEPLINK = "https://www.google.com/preferences/source?q=iqmotorbase.com";

/** Official-style multicolor Google "G" mark (SVG). */
function GoogleLogoMark({ className = "h-5 w-5", title = "Google" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** Wire up Google Preferred Sources SDK when publisher.js loads (manual mode). */
function usePreferredSourceAction() {
  const sdkRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window.PREFERRED_SOURCE = window.PREFERRED_SOURCE || []).push((preferredSource) => {
      sdkRef.current = preferredSource;
      try {
        preferredSource.init({ theme: "light", lang: "en" });
      } catch {
        /* ignore */
      }
    });
  }, []);

  return useCallback((event) => {
    const sdk = sdkRef.current;
    if (sdk && typeof sdk.addPreferredSource === "function") {
      event.preventDefault();
      try {
        sdk.addPreferredSource();
        return;
      } catch {
        /* fall through to deeplink */
      }
    }
  }, []);
}

function PreferredSourceCta({ className = "", label = "Add preferred source" }) {
  const onActivate = usePreferredSourceAction();

  return (
    <a
      href={PREFERRED_SOURCE_DEEPLINK}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onActivate}
      className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#1f1f1f] shadow-md transition-colors hover:bg-gray-50 active:bg-gray-100 ${className}`.trim()}
    >
      <GoogleLogoMark className="h-4 w-4 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </a>
  );
}

function NoscriptLink({ className = "" }) {
  return (
    <noscript>
      <a
        className={`inline-flex min-h-10 items-center rounded-md bg-white px-4 text-sm font-semibold text-primary underline-offset-2 transition-opacity hover:opacity-90 ${className}`.trim()}
        href={PREFERRED_SOURCE_DEEPLINK}
        target="_blank"
        rel="noopener noreferrer"
      >
        Add as preferred source
      </a>
    </noscript>
  );
}

export default function PreferredSourceButton({
  title = "Get IQMotorBase first in Google Search",
  description = "Add us as a preferred source — see our repair guides & shop listings before generic results.",
  variant = "prominent",
  className = "",
}) {
  const onActivate = usePreferredSourceAction();

  if (variant === "stripe") {
    return (
      <aside
        className={`w-full border-b border-primary/80 bg-primary shadow-sm ${className}`}
        aria-label="Add IQMotorBase as a preferred source in Google Search"
      >
        <div className="mx-auto flex max-w-[86.4rem] flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4 sm:px-6 sm:py-2.5">
          <a
            href={PREFERRED_SOURCE_DEEPLINK}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onActivate}
            className="flex min-w-0 cursor-pointer items-center gap-3 text-center transition-opacity hover:opacity-95 sm:text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm sm:h-10 sm:w-10">
              <GoogleLogoMark className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug text-white sm:text-base">{title}</span>
              <span className="mt-0.5 hidden text-xs leading-snug text-white/90 sm:block">{description}</span>
            </span>
          </a>
          <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-end">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/90">Free · 1 click</span>
            <PreferredSourceCta />
          </div>
        </div>
      </aside>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`flex min-h-10 flex-wrap items-center justify-center gap-2.5 sm:justify-start ${className}`}
      >
        <span className="text-sm leading-snug text-secondary">{title}</span>
        <PreferredSourceCta className="!px-2.5" label="Add source" />
        <NoscriptLink className="!bg-primary !text-white" />
      </div>
    );
  }

  return (
    <aside
      className={`rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.14] via-card to-primary/[0.05] p-4 shadow-md ring-1 ring-primary/15 sm:p-5 ${className}`}
      aria-label="Add IQMotorBase as a preferred source in Google Search"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex min-w-0 gap-3 sm:gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary shadow-sm"
            aria-hidden
          >
            <FiBookmark className="h-6 w-6 shrink-0" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug text-title sm:text-lg">{title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-secondary">{description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-stretch justify-center gap-2 sm:items-center lg:items-end">
          <p className="text-center text-xs font-medium uppercase tracking-wide text-primary lg:text-right">
            Free · one click
          </p>
          <PreferredSourceCta className="min-h-11 px-4" />
          <NoscriptLink className="!bg-primary !text-white" />
        </div>
      </div>
    </aside>
  );
}
