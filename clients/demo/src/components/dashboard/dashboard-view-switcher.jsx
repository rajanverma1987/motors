"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  portalViewFromPathname,
  PORTAL_VIEW_CLASSIC,
  PORTAL_VIEW_SIMPLE,
  switchPortalPath,
} from "@/lib/portal-view";

/**
 * Toggle between classic `/dashboard` and simple dense `/dashboards` views.
 */
export default function DashboardViewSwitcher({ className = "" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const currentView = portalViewFromPathname(pathname);

  const classicHref = switchPortalPath(pathname, PORTAL_VIEW_CLASSIC, search);
  const simpleHref = switchPortalPath(pathname, PORTAL_VIEW_SIMPLE, search);

  return (
    <div
      className={`inline-flex shrink-0 items-center rounded border border-border bg-bg p-0.5 text-xs font-medium ${className}`}
      role="group"
      aria-label="Portal view"
    >
      <Link
        href={classicHref}
        className={`rounded px-2.5 py-1 transition-colors ${
          currentView === PORTAL_VIEW_CLASSIC
            ? "bg-card text-title shadow-sm"
            : "text-secondary hover:text-title"
        }`}
        title="Classic dashboard view"
      >
        Classic
      </Link>
      <Link
        href={simpleHref}
        className={`rounded px-2.5 py-1 transition-colors ${
          currentView === PORTAL_VIEW_SIMPLE
            ? "bg-card text-title shadow-sm"
            : "text-secondary hover:text-title"
        }`}
        title="Simple dense view — more on one screen"
      >
        Simple
      </Link>
    </div>
  );
}
