"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMenu, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-xl font-semibold tracking-tight text-title hover:text-primary transition-colors"
        >
          MotorsWinding.com
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-secondary hover:text-text sm:inline-block">
            Log in
          </Link>
          <Link href="/register" className="hidden sm:inline-block">
            <Button variant="outline" size="sm">
              Register
            </Button>
          </Link>
          <Link href="/contact" className="hidden sm:inline-block">
            <Button variant="primary" size="sm">
              Contact for demo
            </Button>
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-md p-2 text-text hover:bg-bg md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2" aria-label="Account">
            <Link href="/login" onClick={() => setMobileOpen(false)} className="block">
              <Button variant="outline" size="sm" className="w-full justify-center">
                Log in
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)} className="block">
              <Button variant="primary" size="sm" className="w-full justify-center">
                Register
              </Button>
            </Link>
            <Link href="/contact" onClick={() => setMobileOpen(false)} className="block">
              <Button variant="outline" size="sm" className="w-full justify-center">
                Contact for demo
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
