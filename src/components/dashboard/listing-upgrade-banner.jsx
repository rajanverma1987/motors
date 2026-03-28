"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import { useAuth } from "@/contexts/auth-context";

const SESSION_KEY = "listing_upgrade_banner_dismissed";

export default function ListingUpgradeBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(SESSION_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!user?.listingOnlyAccount || dismissed) return null;

  return (
    <div className="border-b border-amber-300/80 bg-amber-100/90 px-4 py-2.5 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-semibold">Directory listing plan.</span> Upgrade to full CRM for unlimited leads,
          customers, and workflows.{" "}
          <Link href="/contact" className="font-medium text-primary underline underline-offset-2">
            Contact us
          </Link>{" "}
          for pricing.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(SESSION_KEY, "1");
            } catch (_) {}
            setDismissed(true);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-amber-900 hover:bg-amber-200/80 dark:text-amber-100 dark:hover:bg-amber-900/50"
          aria-label="Dismiss for this session"
        >
          <FiX className="h-4 w-4" />
          Dismiss
        </button>
      </div>
    </div>
  );
}
