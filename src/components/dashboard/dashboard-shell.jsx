"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  CALCULATOR_ONLY_DASHBOARD_HREF,
  isCalculatorOnlyDashboardPath,
} from "@/lib/calculator-portal-routes";
import { isSimplePortalPath } from "@/lib/portal-view";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import ListingUpgradeBanner from "@/components/dashboard/listing-upgrade-banner";
import StripContextualAiWidget from "@/components/dashboard/strip-contextual-ai-widget";
import { StatusFilterCardDesignProvider } from "@/components/simple/status-filter-card-design";

/** Renders dashboard chrome only when the user is allowed on the current route. */
export default function DashboardShell({ children }) {
  const { user, mounted } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const simpleView = isSimplePortalPath(pathname);
  const calcOnly = !!user?.calculatorOnlyAccount;
  const onCalculatorsRoute = isCalculatorOnlyDashboardPath(pathname);
  const onSettingsPage =
    typeof pathname === "string" &&
    (pathname === "/dashboards/settings" ||
      pathname.startsWith("/dashboards/settings/") ||
      pathname === "/dashboard/settings" ||
      pathname.startsWith("/dashboard/settings/"));


  useEffect(() => {
    if (!mounted || !calcOnly || onCalculatorsRoute) return;
    router.replace(CALCULATOR_ONLY_DASHBOARD_HREF);
  }, [mounted, calcOnly, onCalculatorsRoute, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-secondary">
        Loading…
      </div>
    );
  }

  if (calcOnly && !onCalculatorsRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-secondary">
        Redirecting to calculators…
      </div>
    );
  }

  return (
    <StatusFilterCardDesignProvider>
      <StripContextualAiWidget />
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <header className="shrink-0">
          <DashboardNav />
          <ListingUpgradeBanner />
        </header>
        <div className="flex min-h-0 flex-1">
          {!simpleView ? <DashboardSidebar /> : null}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              className={`relative flex min-h-0 min-w-0 flex-1 flex-col overscroll-y-contain ${
                onSettingsPage
                  ? "overflow-hidden p-0"
                  : `overflow-y-auto [scrollbar-gutter:stable] ${simpleView ? "px-2 py-0 sm:px-3" : "p-[10px]"}`
              }`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </StatusFilterCardDesignProvider>
  );
}
