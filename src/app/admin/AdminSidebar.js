"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FiList,
  FiInbox,
  FiUsers,
  FiMapPin,
  FiMail,
  FiLogOut,
  FiShoppingBag,
  FiLifeBuoy,
  FiCreditCard,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/admin/listings", label: "Listings", icon: FiList },
  { href: "/admin/leads", label: "Leads", icon: FiInbox },
  { href: "/admin/clients", label: "Clients", icon: FiUsers },
  { href: "/admin/subscription-plans", label: "Subscriptions", icon: FiCreditCard },
  { href: "/admin/marketplace", label: "Marketplace", icon: FiShoppingBag },
  { href: "/admin/location-pages", label: "Location pages", icon: FiMapPin },
  { href: "/admin/marketing", label: "Marketing", icon: FiMail },
  { href: "/admin/support", label: "Support", icon: FiLifeBuoy },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch (_) {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch (_) {
        /* ignore */
      }
      return next;
    });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/admin/logout", { method: "POST", credentials: "include" });
    window.location.href = "/admin/login";
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-200 ease-out ${
        collapsed ? "w-[4.25rem]" : "w-56"
      }`}
    >
      <div
        className={`flex h-14 shrink-0 items-center border-b border-border ${
          collapsed ? "justify-center px-1" : "justify-between gap-2 px-3"
        }`}
      >
        {!collapsed && (
          <Link href="/admin" className="min-w-0 truncate font-semibold text-title">
            Admin
          </Link>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-secondary transition-colors hover:bg-muted/60 hover:text-title"
          aria-expanded={!collapsed}
          aria-controls="admin-nav"
          title={collapsed ? "Expand menu" : "Collapse menu"}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? (
            <FiChevronRight className="h-5 w-5" aria-hidden />
          ) : (
            <FiChevronLeft className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
      <nav
        id="admin-nav"
        className={`flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto ${collapsed ? "items-stretch px-2 py-3" : "p-3"}`}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-md py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-2" : "gap-3 px-3"
              } ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-secondary hover:bg-muted/50 hover:text-title"
              }`}
            >
              {item.icon && <item.icon className="h-5 w-5 shrink-0" aria-hidden />}
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && <span className="sr-only">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 flex-row items-center justify-center gap-2 border-t border-border px-2 py-3">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-secondary transition-colors hover:bg-muted/50 hover:text-title"
          aria-label="Log out"
          title="Log out"
        >
          <FiLogOut className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
