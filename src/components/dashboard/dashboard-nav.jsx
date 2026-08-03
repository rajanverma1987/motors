"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut, FiSearch, FiSettings } from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";
import GlobalSearchModal from "@/components/dashboard/global-search-modal";
import SimpleHubDateFilter from "@/components/simple/simple-hub-date-filter";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/contexts/user-settings-context";
import { CLASSIC_PORTAL_UI_ENABLED, isSimplePortalPath } from "@/lib/portal-view";
import { SIMPLE_PORTAL_PATH } from "@/lib/simple-portal-tabs";
import DashboardViewSwitcher from "@/components/dashboard/dashboard-view-switcher";

export default function DashboardNav() {
  const { user, logout } = useAuth();
  const { settings } = useUserSettings();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const calculatorOnly = !!user?.calculatorOnlyAccount;
  const simplePortal = isSimplePortalPath(pathname);
  const onSimpleHub = simplePortal && pathname === SIMPLE_PORTAL_PATH && !calculatorOnly;
  const homeHref = calculatorOnly ? "/dashboards?tab=calculators" : SIMPLE_PORTAL_PATH;
  const settingsHref = `${SIMPLE_PORTAL_PATH}/settings`;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "k" && e.key !== "K") return;
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      setSearchOpen(true);
      requestAnimationFrame(() => {
        document.querySelector("[data-global-search-input]")?.focus();
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav
      className={`border-b border-border bg-card px-4 sm:px-6 ${
        simplePortal ? "py-2.5" : "py-3"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-3 sm:gap-4">
        <Link
          href={homeHref}
          className="flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center gap-3 sm:max-w-[min(100%,18rem)]"
          title={user?.shopName || user?.email || "Dashboard"}
        >
          {settings?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt={user?.shopName || "Shop logo"}
              className="h-8 w-auto max-h-8 max-w-[160px] object-contain object-left"
            />
          ) : (
            <span
              className={`truncate font-semibold text-title hover:text-primary ${
                simplePortal ? "text-base tracking-tight" : "text-lg"
              }`}
            >
              {user?.shopName || "Dashboard"}
            </span>
          )}
        </Link>
        {CLASSIC_PORTAL_UI_ENABLED ? (
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <DashboardViewSwitcher />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          {!calculatorOnly ? (
            <>
              {onSimpleHub ? (
                <Suspense fallback={null}>
                  <SimpleHubDateFilter className="hidden lg:flex" />
                </Suspense>
              ) : null}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={`relative flex min-w-0 cursor-text items-center border border-border bg-bg py-2 pl-9 pr-3 text-left text-sm text-secondary transition-colors hover:border-primary/30 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary ${
                  simplePortal ? "rounded-none" : "rounded-md"
                } ${onSimpleHub ? "w-full max-w-[16rem] flex-1 xl:max-w-[20rem]" : "w-full max-w-[33.6rem] flex-1"}`}
                aria-label="Open search (⌘K or Ctrl+K)"
              >
                <FiSearch
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate pr-2 text-left">Search…</span>
                <kbd
                  className="pointer-events-none hidden shrink-0 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-secondary sm:inline"
                  aria-hidden
                >
                  {typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent || "")
                    ? "⌘K"
                    : "Ctrl+K"}
                </kbd>
              </button>
              <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
              <Link
                href={settingsHref}
                className={`inline-flex h-9 w-9 items-center justify-center border border-border bg-card text-text transition-colors hover:bg-primary hover:text-white ${
                  simplePortal ? "rounded-none" : "rounded-md"
                }`}
                title="Settings"
                aria-label="Settings"
              >
                <FiSettings className="h-5 w-5" aria-hidden />
              </Link>
            </>
          ) : null}
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className={`inline-flex h-9 w-9 items-center justify-center border border-border bg-card text-text transition-colors hover:bg-primary hover:text-white ${
              simplePortal ? "rounded-none" : "rounded-md"
            }`}
            title="Log out"
            aria-label="Log out"
          >
            <FiLogOut className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      {onSimpleHub ? (
        <div className="mt-2 lg:hidden">
          <Suspense fallback={null}>
            <SimpleHubDateFilter />
          </Suspense>
        </div>
      ) : null}
    </nav>
  );
}
