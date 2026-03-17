"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiInbox,
  FiUsers,
  FiPackage,
  FiFileText,
  FiClipboard,
  FiDollarSign,
  FiTrendingUp,
  FiGrid,
  FiTag,
  FiTruck,
  FiShoppingCart,
  FiPackage as FiBox,
  FiUserPlus,
  FiSliders,
  FiBarChart2,
  FiGlobe,
  FiSettings,
  FiLayout,
} from "react-icons/fi";

const CORE_NAV = [
  { href: "/dashboard/leads", label: "Leads", icon: FiInbox },
  { href: "/dashboard/customers", label: "Customers", icon: FiUsers },
  { href: "/dashboard/motors", label: "Motor assets", icon: FiPackage },
  { href: "/dashboard/quotes", label: "Quotes", icon: FiFileText },
  { href: "/dashboard/work-orders", label: "Work orders", icon: FiClipboard },
  { href: "/dashboard/invoices", label: "Invoices", icon: FiDollarSign },
  { href: "/dashboard/accounts-receivable", label: "Accounts receivable", icon: FiTrendingUp },
];

const SUPPORTING_NAV = [
  { href: "/dashboard/job-board", label: "Shop floor job board", icon: FiGrid },
  { href: "/dashboard/motor-tag", label: "Motor tag", icon: FiTag },
  { href: "/dashboard/vendors", label: "Vendors", icon: FiTruck },
  { href: "/dashboard/purchase-orders", label: "Purchase orders", icon: FiShoppingCart },
  { href: "/dashboard/logistics", label: "Logistics", icon: FiBox },
  { href: "/dashboard/employees", label: "Employees", icon: FiUserPlus },
  { href: "/dashboard/calculators", label: "Calculators", icon: FiSliders },
  { href: "/dashboard/reports", label: "Reports", icon: FiBarChart2 },
  { href: "/dashboard/customer-portal", label: "Customer portal", icon: FiGlobe },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  const linkClass = (href) => {
    const isActive = pathname === href || (href !== "/dashboard" && pathname?.startsWith(href));
    return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-primary/10 text-primary" : "text-secondary hover:bg-muted/50 hover:text-title"
    }`;
  };

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card overflow-hidden">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <span className="font-semibold text-title">CRM</span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            <FiLayout className="h-5 w-5 shrink-0" aria-hidden />
            Dashboard
          </Link>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
            Core flow
          </p>
          {CORE_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <item.icon className="h-5 w-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
            Supporting
          </p>
          {SUPPORTING_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <item.icon className="h-5 w-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="shrink-0 border-t border-border p-3">
        <Link
          href="/dashboard/settings"
          className={linkClass("/dashboard/settings")}
        >
          <FiSettings className="h-5 w-5 shrink-0" aria-hidden />
          Settings
        </Link>
      </div>
    </aside>
  );
}
