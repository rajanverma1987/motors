"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";

const navLinks = [];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-title hover:text-primary transition-colors"
        >
          MotorsWinding.com
        </Link>
        {navLinks.length > 0 && (
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${pathname === href
                  ? "bg-bg text-primary"
                  : "text-secondary hover:bg-bg hover:text-text"
                  }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
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
          <nav className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${pathname === href ? "bg-bg text-primary" : "text-secondary hover:bg-bg hover:text-text"
                  }`}
              >
                {label}
              </Link>
            ))}
            <div className={navLinks.length > 0 ? "mt-4 flex flex-col gap-2 border-t border-border pt-4" : "flex flex-col gap-2"}>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block">
                <Button variant="outline" size="sm" className="w-full justify-center">
                  Log in
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="block">
                <Button variant="primary" size="sm" className="w-full justify-center">
                  Register center
                </Button>
              </Link>
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="block">
                <Button variant="outline" size="sm" className="w-full justify-center">
                  Contact for demo
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
