"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiBarChart2,
  FiGrid,
  FiHome,
  FiLogOut,
  FiPackage,
  FiSettings,
  FiSliders,
  FiUsers,
  FiX,
} from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";
import PwaInstallButton from "@/components/pwa-install-button";
import { useAuth } from "@/contexts/auth-context";
import { settingsPathForPortalUi } from "@/lib/portal-view";
import {
  SIMPLE_TAB_CALCULATORS,
  SIMPLE_TAB_CUSTOMERS,
  SIMPLE_TAB_DASHBOARD,
  SIMPLE_TAB_INVENTORY,
  SIMPLE_TAB_JOB_BOARD,
  SIMPLE_TAB_REPORTS,
} from "@/lib/simple-portal-tabs";
import { useSimplePhoneChrome } from "@/components/simple/simple-phone-chrome-context";

const TAB_ICONS = {
  [SIMPLE_TAB_DASHBOARD]: FiHome,
  [SIMPLE_TAB_JOB_BOARD]: FiGrid,
  [SIMPLE_TAB_CUSTOMERS]: FiUsers,
  [SIMPLE_TAB_INVENTORY]: FiPackage,
  [SIMPLE_TAB_REPORTS]: FiBarChart2,
  [SIMPLE_TAB_CALCULATORS]: FiSliders,
};

/**
 * Left drawer for Simple phone chrome: secondary hub tabs + utilities.
 */
export default function SimplePhoneDrawer() {
  const router = useRouter();
  const { user, logout, isOwner } = useAuth();
  const { isPhone, drawerOpen, closeDrawer, hubChrome } = useSimplePhoneChrome();
  const panelRef = useRef(null);
  const effectiveIsOwner =
    isOwner ??
    Boolean(user && !(user?.isEmployee || user?.authType === "employee" || Boolean(user?.employeeId)));
  const calculatorOnly = !!user?.calculatorOnlyAccount;
  const settingsHref = calculatorOnly
    ? "/dashboards?tab=calculators"
    : settingsPathForPortalUi(user?.portalUi);
  const companyName = String(user?.shopName || "").trim() || "IQMotorBase";
  const navItems = hubChrome?.drawerItems || [];
  const activeTab = hubChrome?.activeTab || null;
  const onSelectTab = hubChrome?.onSelectTab;

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const btn = panelRef.current?.querySelector("button, a");
    btn?.focus?.();
  }, [drawerOpen]);

  if (!isPhone || typeof document === "undefined") return null;
  if (!drawerOpen) return null;

  const handleLogout = () => {
    closeDrawer();
    logout();
    router.push("/");
  };

  const handleTab = (id) => {
    onSelectTab?.(id);
    closeDrawer();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={closeDrawer}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 left-0 flex w-[min(100%,18.5rem)] flex-col border-r border-border bg-card shadow-lg pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <p className="min-w-0 truncate text-sm font-semibold text-title">{companyName}</p>
          <button
            type="button"
            onClick={closeDrawer}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-border bg-card text-text hover:bg-primary/10"
            aria-label="Close menu"
          >
            <FiX className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {navItems.length > 0 ? (
            <div className="border-b border-border py-2">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-secondary">
                Sections
              </p>
              <ul className="flex flex-col">
                {navItems.map((item) => {
                  const Icon = TAB_ICONS[item.id] || FiGrid;
                  const active = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleTab(item.id)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold ${
                          active
                            ? "bg-primary/15 text-primary"
                            : "text-title hover:bg-primary/10"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="py-2">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-secondary">
              Account
            </p>
            <ul className="flex flex-col">
              {!calculatorOnly && effectiveIsOwner ? (
                <li>
                  <Link
                    href={settingsHref}
                    onClick={closeDrawer}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-title hover:bg-primary/10"
                  >
                    <FiSettings className="h-4 w-4 shrink-0" aria-hidden />
                    Settings
                  </Link>
                </li>
              ) : null}
              {!calculatorOnly ? (
                <li>
                  <Link
                    href="/dashboards/employees"
                    onClick={closeDrawer}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold text-title hover:bg-primary/10"
                  >
                    <FiUsers className="h-4 w-4 shrink-0" aria-hidden />
                    Employees
                  </Link>
                </li>
              ) : null}
              <li className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm font-semibold text-title">Theme</span>
                <ThemeToggle />
              </li>
              <li className="px-3 py-2">
                <PwaInstallButton className="w-full justify-center" />
              </li>
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-danger/10"
                >
                  <FiLogOut className="h-4 w-4 shrink-0" aria-hidden />
                  Log out
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
