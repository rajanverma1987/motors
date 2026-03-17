"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiLogOut, FiSearch } from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardNav() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        <Link href="/dashboard" className="text-lg font-semibold text-title hover:text-primary shrink-0" title={user?.email}>
          {user?.shopName || "Dashboard"}
        </Link>
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4 max-w-2xl ml-4">
          <div className="relative flex-1 min-w-0 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
            <input
              type="search"
              placeholder="Search…"
              aria-label="Search"
              className="w-full rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-title placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-text transition-colors hover:bg-primary hover:text-white"
            title="Log out"
            aria-label="Log out"
          >
            <FiLogOut className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </nav>
  );
}
