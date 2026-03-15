"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiLogOut } from "react-icons/fi";
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
    <nav className="border-b border-border bg-card px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-title hover:text-primary">
            MotorsWinding.com
          </Link>
          <Link href="/dashboard" className="text-sm text-secondary hover:text-text">
            Dashboard
          </Link>
          {user && (
            <span className="text-sm text-secondary" title={user.email}>
              {user.shopName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
