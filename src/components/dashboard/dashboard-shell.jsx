"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  CALCULATOR_ONLY_DASHBOARD_PATH,
  isCalculatorOnlyDashboardPath,
} from "@/lib/calculator-portal-routes";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import ListingUpgradeBanner from "@/components/dashboard/listing-upgrade-banner";
import StripContextualAiWidget from "@/components/dashboard/strip-contextual-ai-widget";

/** Renders dashboard chrome only when the user is allowed on the current route. */
export default function DashboardShell({ children }) {
  const { user, mounted } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const calcOnly = !!user?.calculatorOnlyAccount;
  const onCalculatorsRoute = isCalculatorOnlyDashboardPath(pathname);

  useEffect(() => {
    if (!mounted || !calcOnly || onCalculatorsRoute) return;
    router.replace(CALCULATOR_ONLY_DASHBOARD_PATH);
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
    <>
      <StripContextualAiWidget />
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <header className="shrink-0">
          <DashboardNav />
          <ListingUpgradeBanner />
        </header>
        <div className="flex min-h-0 flex-1">
          <DashboardSidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-[10px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
