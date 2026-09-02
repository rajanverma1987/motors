"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut, FiSearch, FiSettings, FiUsers } from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";
import GlobalSearchModal from "@/components/dashboard/global-search-modal";
import SimpleHubDateFilter from "@/components/simple/simple-hub-date-filter";
import { useAuth } from "@/contexts/auth-context";
import { CLASSIC_PORTAL_UI_ENABLED, isSimplePortalPath, portalLandingPath, settingsPathForPortalUi } from "@/lib/portal-view";
import { SIMPLE_PORTAL_PATH } from "@/lib/simple-portal-tabs";
import DashboardViewSwitcher from "@/components/dashboard/dashboard-view-switcher";
import PwaInstallButton from "@/components/pwa-install-button";

export default function DashboardNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);
  const calculatorOnly = !!user?.calculatorOnlyAccount;
  const simplePortal = isSimplePortalPath(pathname);
  const onSimpleHub = simplePortal && pathname === SIMPLE_PORTAL_PATH && !calculatorOnly;
  const homeHref = portalLandingPath({
    calculatorOnlyAccount: calculatorOnly,
    portalUi: user?.portalUi,
  });
  const settingsHref = calculatorOnly
    ? "/dashboards?tab=calculators"
    : settingsPathForPortalUi(user?.portalUi);
  const companyName = String(user?.shopName || "").trim() || "Dashboard";
  const userDisplayName =
    String(user?.contactName || "").trim() || String(user?.email || "").trim() || "";
  const iconBtnClass = `inline-flex h-9 w-9 items-center justify-center border border-border bg-card text-text transition-colors hover:bg-primary hover:text-white ${
    simplePortal ? "rounded-none" : "rounded-md"
  }`;

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

  useEffect(() => {
    if (!settingsMenuOpen) return undefined;
    const onDoc = (e) => {
      if (settingsMenuRef.current?.contains(e.target)) return;
      setSettingsMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setSettingsMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [settingsMenuOpen]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav
      className={`dashboard-nav border-b border-border px-4 sm:px-6 ${
        simplePortal ? "py-2.5" : "py-3"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-3 sm:gap-4">
        <Link
          href={homeHref}
          className="flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center gap-3 sm:max-w-[min(100%,18rem)]"
          title={companyName}
        >
          <span
            className={`truncate font-semibold text-title hover:text-primary ${
              simplePortal ? "text-base tracking-tight" : "text-lg"
            }`}
          >
            {companyName}
          </span>
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
                  <SimpleHubDateFilter placement="nav" />
                </Suspense>
              ) : null}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={iconBtnClass}
                title="Search (⌘K or Ctrl+K)"
                aria-label="Open search (⌘K or Ctrl+K)"
              >
                <FiSearch className="h-5 w-5" aria-hidden />
              </button>
              <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
              {simplePortal ? (
                <div className="relative" ref={settingsMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSettingsMenuOpen((o) => !o)}
                    className={iconBtnClass}
                    title="Settings and Employees"
                    aria-label="Settings and Employees"
                    aria-haspopup="menu"
                    aria-expanded={settingsMenuOpen}
                  >
                    <FiSettings className="h-5 w-5" aria-hidden />
                  </button>
                  {settingsMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-1 min-w-[10.5rem] border border-border bg-card py-1 shadow-lg"
                    >
                      <Link
                        role="menuitem"
                        href={settingsHref}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-title hover:bg-primary/10"
                        onClick={() => setSettingsMenuOpen(false)}
                      >
                        <FiSettings className="h-4 w-4 shrink-0" aria-hidden />
                        Settings
                      </Link>
                      <Link
                        role="menuitem"
                        href="/dashboards/employees"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-title hover:bg-primary/10"
                        onClick={() => setSettingsMenuOpen(false)}
                      >
                        <FiUsers className="h-4 w-4 shrink-0" aria-hidden />
                        Employees
                      </Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link
                  href={settingsHref}
                  className={iconBtnClass}
                  title="Settings"
                  aria-label="Settings"
                >
                  <FiSettings className="h-5 w-5" aria-hidden />
                </Link>
              )}
            </>
          ) : null}
          <PwaInstallButton className="hidden sm:inline-flex" />
          <ThemeToggle />
          {userDisplayName ? (
            <span
              className="hidden min-w-0 max-w-[10rem] truncate text-sm font-medium text-title sm:inline"
              title={userDisplayName}
            >
              {userDisplayName}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className={iconBtnClass}
            title="Log out"
            aria-label="Log out"
          >
            <FiLogOut className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      {onSimpleHub ? (
        <div className="relative z-30 mt-2 flex w-full justify-end lg:hidden">
          <Suspense fallback={null}>
            <SimpleHubDateFilter placement="below" />
          </Suspense>
        </div>
      ) : null}
    </nav>
  );
}
