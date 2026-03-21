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
  FiSettings,
  FiLayout,
  FiShoppingBag,
  FiLifeBuoy,
  FiMapPin,
  FiRepeat,
  FiKey,
} from "react-icons/fi";

const CUSTOMERS_NAV = [
  { href: "/dashboard/leads", label: "Leads", icon: FiInbox },
  { href: "/dashboard/customers", label: "Customers", icon: FiUsers },
  { href: "/dashboard/motors", label: "Motor assets", icon: FiPackage },
];

const JOBS_NAV = [
  { href: "/dashboard/quotes", label: "Quotes", icon: FiFileText },
  { href: "/dashboard/work-orders", label: "Work orders", icon: FiClipboard },
  { href: "/dashboard/inventory", label: "Inventory", icon: FiPackage },
];

const ACCOUNTING_NAV = [
  { href: "/dashboard/invoices", label: "Invoices", icon: FiDollarSign },
  { href: "/dashboard/accounts-receivable", label: "Accounts receivable", icon: FiTrendingUp },
];

const PROCUREMENT_NAV = [
  { href: "/dashboard/vendors", label: "Vendors", icon: FiTruck },
  { href: "/dashboard/purchase-orders", label: "Purchase orders", icon: FiShoppingCart },
  { href: "/dashboard/accounts-payable", label: "Accounts payable", icon: FiCreditCard },
];

const OPERATIONS_NAV = [
  { href: "/dashboard/job-board", label: "Shop floor job board", icon: FiGrid },
  { href: "/dashboard/logistics", label: "Logistics", icon: FiBox },
];

const PEOPLE_NAV = [
  { href: "/dashboard/employees", label: "Employees", icon: FiUserPlus },
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
  { title: "Jobs", items: JOBS_NAV },
  { title: "Accounting", items: ACCOUNTING_NAV },
  { title: "Procurement & payables", items: PROCUREMENT_NAV },
  { title: "Operations", items: OPERATIONS_NAV },
  { title: "People", items: PEOPLE_NAV },
  { title: "Tools & reports", items: TOOLS_NAV },
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
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card overflow-hidden">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <span className="font-semibold text-title">CRM</span>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <Link href="/dashboard" className={`whitespace-nowrap ${linkClass("/dashboard")}`}>
            <FiLayout className="h-5 w-5 shrink-0" aria-hidden />
            Dashboard
          </Link>
        </div>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-b-0 last:pb-0">
            <p className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-secondary">
              {group.title}
            </p>
            {group.items.map((item) => (
              <Link key={item.href} href={item.href} className={`whitespace-nowrap ${linkClass(item.href)}`}>
                <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-border p-3">
        <Link
          href="/dashboard/settings"
          className={`whitespace-nowrap ${linkClass("/dashboard/settings")}`}
        >
          <FiSettings className="h-5 w-5 shrink-0" aria-hidden />
          Settings
        </Link>
      </div>
    </aside>
  );
}
