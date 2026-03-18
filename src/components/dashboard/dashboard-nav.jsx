"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiLogOut, FiSearch } from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";
import GlobalSearchModal from "@/components/dashboard/global-search-modal";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/contexts/user-settings-context";

export default function DashboardNav() {
  const { user, logout } = useAuth();
  const { settings } = useUserSettings();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

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
    <nav className="border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="flex w-full items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="flex min-w-0 max-w-[min(100%,28rem)] shrink-0 items-center gap-3"
          title={user?.email}
        >
          {settings?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoUrl}
              alt=""
              className="h-8 w-auto max-h-8 max-w-[100px] object-contain object-left"
            />
          ) : null}
          <span className="truncate text-lg font-semibold text-title hover:text-primary">
            {user?.shopName || "Dashboard"}
          </span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4 max-w-2xl ml-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="relative flex w-full min-w-0 max-w-md flex-1 cursor-text items-center rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-left text-sm text-secondary transition-colors hover:border-primary/30 hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Open search (⌘K or Ctrl+K)"
          >
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
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
