"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiMenu, FiX } from "react-icons/fi";
import ThemeToggle from "@/components/theme-toggle";

const navBtnPrimary =
  "inline-flex items-center justify-center rounded-md bg-primary px-3 py-1 text-sm text-white transition-opacity hover:opacity-90";
const navBtnOutline =
  "inline-flex items-center justify-center rounded-md border-[0.5px] border-border bg-transparent px-3 py-1 text-sm text-text transition-opacity hover:bg-card hover:border-primary/20";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 max-w-[86.4rem] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-xl font-semibold tracking-tight text-title transition-colors hover:text-primary"
        >
          IQMotorBase.com
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden text-sm font-medium text-secondary hover:text-text md:inline-block">
            Log in
          </Link>
          <Link href="/register" className={`hidden md:inline-block ${navBtnOutline}`}>
            Register
          </Link>
          <Link href="/contact" className={`hidden md:inline-block ${navBtnPrimary}`}>
            Contact for demo
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-md p-2 text-text hover:bg-bg md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-drawer"
          >
            {mobileOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile: right sidebar drawer */}
      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
            mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!mobileOpen}
          inert={!mobileOpen ? true : undefined}
          onClick={closeMobile}
        />
        <aside
          id="marketing-mobile-drawer"
          className={`fixed inset-y-0 right-0 z-[70] flex w-[min(100%,19rem)] max-w-[88vw] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
          }`}
          aria-hidden={!mobileOpen}
          inert={!mobileOpen ? true : undefined}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold text-title">Menu</span>
            <button
              type="button"
              onClick={closeMobile}
              className="rounded-md p-2 text-secondary hover:bg-bg hover:text-title"
              aria-label="Close menu"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-label="Account">
            <Link href="/login" onClick={closeMobile} className={`inline-flex ${navBtnOutline}`}>
              Log in
            </Link>
            <Link href="/register" onClick={closeMobile} className={`inline-flex ${navBtnPrimary}`}>
              Register
            </Link>
            <Link href="/contact" onClick={closeMobile} className={`inline-flex ${navBtnOutline}`}>
              Contact for demo
            </Link>
          </nav>
        </aside>
      </div>
    </header>
  );
}
