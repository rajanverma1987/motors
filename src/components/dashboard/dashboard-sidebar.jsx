"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  FiInbox,
  FiUsers,
  FiUser,
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiGrid,
  FiTruck,
  FiShoppingCart,
  FiPackage as FiBox,
  FiUserPlus,
  FiBriefcase,
  FiShield,
  FiSliders,
  FiBarChart2,
  FiGlobe,
  FiLayout,
  FiShoppingBag,
  FiLifeBuoy,
  FiMapPin,
  FiRepeat,
  FiKey,
  FiPercent,
  FiLayers,
  FiChevronRight,
  FiChevronLeft,
} from "react-icons/fi";
const SIDEBAR_COLLAPSED_KEY = "dashboard-sidebar-collapsed";

const CUSTOMERS_NAV = [
  { href: "/dashboard/leads", label: "Leads", icon: FiInbox },
  { href: "/dashboard/customers", label: "Customers", icon: FiUsers },
  { href: "/dashboard/motors", label: "Customer's motors", icon: FiPackage },
];

const ALL_JOBS_NAV = [{ href: "/dashboard/all-jobs", label: "All jobs", icon: FiLayers }];

const ACCOUNTING_NAV = [
  { href: "/dashboard/accounts-receivable", label: "Accounts receivable", icon: FiTrendingUp },
  { href: "/dashboard/taxes", label: "Taxes", icon: FiPercent },
  { href: "/dashboard/ledger", label: "Ledger", icon: FiCreditCard },
];

const PROCUREMENT_NAV = [
  { href: "/dashboard/vendors", label: "Vendors", icon: FiTruck },
  { href: "/dashboard/purchase-orders", label: "Purchase orders", icon: FiShoppingCart },
  { href: "/dashboard/accounts-payable", label: "Accounts payable", icon: FiCreditCard },
  { href: "/dashboard/sales-commission", label: "Sales commission", icon: FiDollarSign },
  { href: "/dashboard/inventory", label: "Inventory", icon: FiPackage },
];

const OPERATIONS_NAV = [
  { href: "/dashboard/job-board", label: "Shop floor job board", icon: FiGrid },
  { href: "/dashboard/logistics", label: "Receiving & Shipping", icon: FiBox },
];

const PEOPLE_NAV = [
  { href: "/dashboard/employees", label: "Employees", icon: FiUserPlus },
  { href: "/dashboard/sales-person", label: "Sales Person", icon: FiUser },
  { href: "/dashboard/job-postings", label: "Job postings", icon: FiBriefcase },
  { href: "/dashboard/access-control", label: "Access control", icon: FiShield },
];

const TOOLS_NAV = [
  { href: "/dashboard/calculators", label: "Calculators", icon: FiSliders },
  { href: "/dashboard/subscription", label: "Subscription", icon: FiRepeat },
  { href: "/dashboard/reports", label: "Reports", icon: FiBarChart2 },
  { href: "/dashboard/integrations", label: "API integrations", icon: FiKey },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: FiShoppingBag },
  { href: "/dashboard/directory-listing", label: "Directory listing", icon: FiMapPin },
  { href: "/dashboard/customer-portal", label: "Customer portal", icon: FiGlobe },
  { href: "/dashboard/support", label: "Support", icon: FiLifeBuoy },
];

const NAV_GROUPS = [
  { title: "Customers", items: CUSTOMERS_NAV },
  { title: "All Jobs", items: ALL_JOBS_NAV },
  { title: "Accounting", items: ACCOUNTING_NAV },
  { title: "Procurement & payables", items: PROCUREMENT_NAV },
  { title: "Operations", items: OPERATIONS_NAV },
  { title: "People", items: PEOPLE_NAV },
  { title: "Tools & reports", items: TOOLS_NAV },
];

const CALCULATOR_ONLY_NAV = [{ href: "/dashboard/calculators", label: "Calculators", icon: FiSliders }];

function navItemIsActive(pathname, href) {
  return pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
}

function groupContainsActive(pathname, group) {
  return group.items.some((item) => navItemIsActive(pathname, item.href));
}

function slugify(title) {
  return title.replace(/\s+/g, "-").toLowerCase();
}

function NavItemLink({ href, label, icon: Icon, isActive, collapsed }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group flex items-center rounded-md text-sm font-semibold transition-colors ${
        collapsed ? "justify-center p-1" : "gap-2 py-1.5 pl-1.5 pr-2"
      } ${
        isActive
          ? "bg-primary/12 text-primary"
          : "text-title hover:bg-muted/40"
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded transition-colors ${
          collapsed ? "h-7 w-7" : "h-6 w-6"
        } ${
          isActive
            ? "bg-primary text-white"
            : "bg-muted/30 text-title/70 group-hover:bg-muted/50 group-hover:text-title"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {!collapsed ? <span className="min-w-0 truncate leading-snug">{label}</span> : null}
    </Link>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const calculatorOnly = !!user?.calculatorOnlyAccount;
  const navGroups = calculatorOnly ? [{ title: "Calculators", items: CALCULATOR_ONLY_NAV }] : NAV_GROUPS;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(navGroups.map((g) => g.title)));

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") setSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const activeGroup = navGroups.find((g) => groupContainsActive(pathname, g));
    if (!activeGroup) return;
    setExpandedGroups((prev) => {
      if (prev.has(activeGroup.title)) return prev;
      const next = new Set(prev);
      next.add(activeGroup.title);
      return next;
    });
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((title) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const dashboardActive = pathname === "/dashboard";

  return (
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-bg transition-[width] duration-200 ease-out ${
        sidebarCollapsed ? "w-[4.25rem]" : "w-64"
      }`}
    >
      <div
        className={`flex h-11 shrink-0 items-center border-b border-border bg-card ${
          sidebarCollapsed ? "justify-center px-1.5" : "justify-between gap-1.5 px-2"
        }`}
      >
        {!sidebarCollapsed ? (
          <span className="truncate text-sm font-semibold tracking-tight text-title">
            {calculatorOnly ? "Calculators" : "CRM"}
          </span>
        ) : null}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary transition-colors hover:bg-muted/50 hover:text-title"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <FiChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <FiChevronLeft className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>

      <nav
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden ${
          sidebarCollapsed ? "gap-0.5 p-1.5" : "gap-1.5 p-2"
        }`}
      >
        {!calculatorOnly ? (
          <Link
            href="/dashboard"
            title={sidebarCollapsed ? "Dashboard" : undefined}
            className={`flex items-center rounded-md text-sm font-semibold transition-colors ${
              sidebarCollapsed ? "justify-center p-1.5" : "gap-2 px-2 py-1.5"
            } ${
              dashboardActive
                ? "bg-primary text-white shadow-sm"
                : "text-title hover:bg-card"
            }`}
          >
            <FiLayout
              className={`shrink-0 opacity-90 ${sidebarCollapsed ? "h-4 w-4" : "h-4 w-4"}`}
              aria-hidden
            />
            {!sidebarCollapsed ? <span>Dashboard</span> : null}
          </Link>
        ) : null}

        {sidebarCollapsed ? (
          <div className="flex flex-col gap-0.5">
            {navGroups.map((group, groupIdx) => (
              <div key={group.title}>
                {groupIdx > 0 ? <div className="mx-auto my-0.5 h-px w-5 bg-border" aria-hidden /> : null}
                <ul className="flex flex-col gap-px">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <NavItemLink
                        href={item.href}
                        label={item.label}
                        icon={item.icon}
                        isActive={navItemIsActive(pathname, item.href)}
                        collapsed
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {navGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.title);
              const groupActive = groupContainsActive(pathname, group);
              const panelId = `sidebar-group-${slugify(group.title)}`;

              return (
                <section
                  key={group.title}
                  className={`overflow-hidden rounded-lg border transition-shadow ${
                    groupActive
                      ? "border-primary/25 bg-card shadow-sm"
                      : "border-border/80 bg-card/60"
                  }`}
                >
                  <button
                    type="button"
                    id={`${panelId}-trigger`}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={() => toggleGroup(group.title)}
                    className={`flex w-full items-center gap-1.5 border-l-[3px] px-2 py-1.5 text-left transition-colors ${
                      groupActive
                        ? "border-l-primary bg-primary text-white"
                        : "border-l-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                        groupActive ? "bg-white/15" : "bg-primary/10"
                      }`}
                    >
                      <FiChevronRight
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        aria-hidden
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-wide leading-tight">
                      {group.title}
                    </span>
                    {groupActive ? (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/90"
                        aria-hidden
                        title="Current section"
                      />
                    ) : null}
                  </button>

                  {isExpanded ? (
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={`${panelId}-trigger`}
                      className="border-t border-border/70 px-1 py-1"
                    >
                      <ul className="flex flex-col gap-px">
                        {group.items.map((item) => (
                          <li key={item.href}>
                            <NavItemLink
                              href={item.href}
                              label={item.label}
                              icon={item.icon}
                              isActive={navItemIsActive(pathname, item.href)}
                              collapsed={false}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
