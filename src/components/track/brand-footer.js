"use client";

import Link from "next/link";
import BrandLogo from "@/components/marketing/brand-logo";

/** Compact IQMotorBase wordmark for the Track PWA footer. */
export default function TrackBrandFooter({ className = "" }) {
  return (
    <footer
      className={`shrink-0 border-t border-border bg-card px-4 py-2.5 ${className}`.trim()}
    >
      <Link
        href="/"
        className="mx-auto flex max-w-[11rem] items-center justify-center opacity-90 transition-opacity hover:opacity-100"
        aria-label="IQMotorBase home"
      >
        <BrandLogo
          plain
          alt="IQMotorBase"
          className="h-6 w-auto max-w-full object-contain object-center"
        />
      </Link>
    </footer>
  );
}
