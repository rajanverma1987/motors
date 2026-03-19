"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiList, FiInbox, FiUsers, FiMapPin, FiMail, FiLogOut, FiShoppingBag, FiLifeBuoy } from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/admin/listings", label: "Listings", icon: FiList },
  { href: "/admin/leads", label: "Leads", icon: FiInbox },
  { href: "/admin/clients", label: "Clients", icon: FiUsers },
  { href: "/admin/marketplace", label: "Marketplace", icon: FiShoppingBag },
  { href: "/admin/location-pages", label: "Location pages", icon: FiMapPin },
  { href: "/admin/marketing", label: "Marketing", icon: FiMail },
  { href: "/admin/support", label: "Support", icon: FiLifeBuoy },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/admin/logout", { method: "POST", credentials: "include" });
    window.location.href = "/admin/login";
  }

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-card overflow-hidden">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <Link href="/admin" className="font-semibold text-title">
          Admin
        </Link>
      </div>
      <nav className="min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3 flex">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-secondary hover:bg-muted/50 hover:text-title"
              }`}
            >
              {item.icon && <item.icon className="h-5 w-5 shrink-0" aria-hidden />}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-border p-3 space-y-1">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-secondary hover:bg-muted/50 hover:text-title"
        >
          <FiLogOut className="h-5 w-5 shrink-0" aria-hidden />
          Log out
        </button>
      </div>
    </aside>
  );
}
