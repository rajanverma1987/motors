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
import { SimplePhoneChromeProvider } from "@/components/simple/simple-phone-chrome-context";
import SimplePhoneDrawer from "@/components/simple/simple-phone-drawer";

function DashboardShellInner({ children }) {
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
  const onServiceProposalFormPage =
    typeof pathname === "string" &&
    (pathname === "/dashboards/service-proposals/new" ||
      pathname.startsWith("/dashboards/service-proposals/"));
  const onPurchaseOrderFormPage =
    typeof pathname === "string" &&
    (pathname === "/dashboards/purchase-orders/new" ||
      (pathname.startsWith("/dashboards/purchase-orders/") &&
        pathname !== "/dashboards/purchase-orders"));
  const onMasterDataSearchResultsPage =
    typeof pathname === "string" && pathname.startsWith("/dashboards/master-data-search/");
  const isEmployee = Boolean(
    user?.isEmployee ?? (user?.authType === "employee" || Boolean(user?.employeeId))
  );

  useEffect(() => {
    if (!mounted) return;
    if (calcOnly && !onCalculatorsRoute) {
      router.replace(CALCULATOR_ONLY_DASHBOARD_HREF);
      return;
    }
    if (isEmployee && onSettingsPage) {
      router.replace(simpleView ? "/dashboards" : "/dashboard");
    }
  }, [mounted, calcOnly, onCalculatorsRoute, isEmployee, onSettingsPage, simpleView, router]);

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

  if (isEmployee && onSettingsPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-secondary">
        Redirecting to dashboard…
      </div>
    );
  }

  return (
    <>
      <StripContextualAiWidget />
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <header className="shrink-0 pt-[env(safe-area-inset-top)] md:pt-0">
          <DashboardNav />
          <ListingUpgradeBanner />
        </header>
        <div className="flex min-h-0 flex-1">
          {!simpleView ? <DashboardSidebar /> : null}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div
              className={`relative flex min-h-0 min-w-0 max-w-full flex-1 flex-col overscroll-y-contain ${
                onSettingsPage ||
                onServiceProposalFormPage ||
                onPurchaseOrderFormPage ||
                onMasterDataSearchResultsPage
                  ? "overflow-x-hidden overflow-y-hidden p-0"
                  : `overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] ${simpleView ? "px-2 py-0 sm:px-3" : "p-[10px]"}`
              }`}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
      {simpleView ? <SimplePhoneDrawer /> : null}
    </>
  );
}

/** Renders dashboard chrome only when the user is allowed on the current route. */
export default function DashboardShell({ children }) {
  return (
    <StatusFilterCardDesignProvider>
      <SimplePhoneChromeProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </SimplePhoneChromeProvider>
    </StatusFilterCardDesignProvider>
  );
}
