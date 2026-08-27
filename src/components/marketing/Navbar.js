"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import { useAuth } from "@/contexts/auth-context";
import { DEFAULT_PORTAL_LANDING_PATH } from "@/lib/all-jobs-tabs";
import { BRAND_LOGO_HEIGHT, BRAND_LOGO_PUBLIC_PATH, BRAND_LOGO_WIDTH } from "@/lib/brand-logo";

const productNav = {
  href: "/motor-repair-shop-management-software",
  label: "Motor Shop Management Software",
};

/** Dark mode only: light warm copper panel (hue ~28–32°) so dark logo artwork reads clearly. */
const navDarkSurface =
  "dark:border-[hsl(28_18%_72%)] dark:!bg-[linear-gradient(180deg,hsl(32_32%_94%)_0%,hsl(28_26%_88%)_100%)] dark:shadow-[inset_0_1px_0_0_hsl(38_42%_98%)]";

function navPathBase(href) {
  const i = href.indexOf("#");
  const path = i === -1 ? href : href.slice(0, i);
  return path === "" ? "/" : path;
}

function isNavActive(pathname, href) {
  const base = navPathBase(href);
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function ProductNavLink({ href, label, pathname, className = "" }) {
  const active = isNavActive(pathname, href);
  return (
    <Link
      href={href}
      className={`inline-flex items-center whitespace-normal rounded-md border px-3 py-2 text-left text-sm font-semibold leading-snug transition-colors sm:whitespace-nowrap ${active
          ? "border-primary bg-primary/15 text-primary shadow-sm dark:border-primary/50 dark:bg-primary/20"
          : "border-primary/35 bg-primary/10 text-primary hover:border-primary/50 hover:bg-primary/15 dark:border-primary/40 dark:bg-primary/15 dark:hover:bg-primary/20"
        } ${className}`.trim()}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname() || "";
  const { user, mounted } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dashboardHref = user?.calculatorOnlyAccount
    ? "/dashboards?tab=calculators"
    : DEFAULT_PORTAL_LANDING_PATH;

  useEffect(() => {
    if (!mobileOpen) return;
    const scrollBarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollBarGap > 0) document.body.style.paddingRight = `${scrollBarGap}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
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
    <>
      <header
        className={`sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75 ${navDarkSurface}`}
      >
        <div className="mx-auto flex h-16 max-w-[86.4rem] items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:gap-4 sm:px-6 md:min-h-[4.5rem] md:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 md:gap-4">
            <Link
              href="/"
              className="min-w-0 shrink-0 transition-opacity hover:opacity-85"
              aria-label="IQ Motorbase — home"
            >
              <Image
                src={BRAND_LOGO_PUBLIC_PATH}
                alt="IQ Motorbase"
                width={BRAND_LOGO_WIDTH}
                height={BRAND_LOGO_HEIGHT}
                className="h-[1.5rem] w-auto max-w-[min(100%,9rem)] object-contain object-left sm:h-[1.625rem] sm:max-w-[min(100%,10rem)] md:h-[2.43rem] md:max-w-[min(100vw-22rem,238px)]"
                priority
              />
            </Link>
            <div className="hidden min-w-0 sm:block md:max-w-[min(100%,20rem)] lg:max-w-none">
              <ProductNavLink
                href={productNav.href}
                label={productNav.label}
                pathname={pathname}
                className="max-w-full"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 sm:gap-3 md:flex">
              {mounted && user ? (
                <Link
                  href={dashboardHref}
                  className="whitespace-nowrap px-2 py-2 text-sm font-medium text-secondary transition-colors hover:text-title dark:text-[hsl(25_22%_34%)] dark:hover:text-[hsl(22_38%_12%)]"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="whitespace-nowrap px-2 py-2 text-sm font-medium text-secondary transition-colors hover:text-title dark:text-[hsl(25_22%_34%)] dark:hover:text-[hsl(22_38%_12%)]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="whitespace-nowrap rounded-md border border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-primary/30 hover:bg-form-bg dark:border-[hsl(28_20%_68%)] dark:text-[hsl(22_35%_14%)] dark:hover:border-primary/40 dark:hover:bg-[hsl(32_28%_96%)]"
                  >
                    Register
                  </Link>
                </>
              )}
              <Link
                href="/contact"
                className="whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-92"
              >
                Contact for demo
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-title transition-colors hover:bg-form-bg dark:border-[hsl(28_20%_70%)] dark:bg-[hsl(32_26%_92%)] dark:text-[hsl(22_35%_12%)] dark:hover:bg-[hsl(30_24%_96%)] md:hidden"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="marketing-mobile-drawer"
            >
              {mobileOpen ? <FiX className="h-5 w-5" aria-hidden /> : <FiMenu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
          aria-hidden={!mobileOpen}
          inert={!mobileOpen ? true : undefined}
          onClick={closeMobile}
        />
        <aside
          id="marketing-mobile-drawer"
          className={`fixed inset-y-0 right-0 z-[110] flex h-dvh max-h-dvh w-[min(100%,20rem)] flex-col border-l border-border bg-card shadow-xl transition-transform duration-200 ease-out ${mobileOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
            }`}
          aria-hidden={!mobileOpen}
          inert={!mobileOpen ? true : undefined}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <span className="text-sm font-semibold text-title">Menu</span>
            <button
              type="button"
              onClick={closeMobile}
              className="flex h-9 w-9 items-center justify-center rounded-md text-secondary transition-colors hover:bg-form-bg hover:text-title"
              aria-label="Close menu"
            >
              <FiX className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="Marketing">
            <div className="border-b border-border p-4">
              <ProductNavLink
                href={productNav.href}
                label={productNav.label}
                pathname={pathname}
                className="w-full justify-center text-center text-base"
              />
            </div>
            <div className="flex flex-col gap-2 p-4">
              {mounted && user ? (
                <Link
                  href={dashboardHref}
                  onClick={closeMobile}
                  className="flex min-h-11 items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-form-bg"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobile}
                    className="flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-text transition-colors hover:bg-form-bg"
                  >
                    Register
                  </Link>
                </>
              )}
              <Link
                href="/contact"
                onClick={closeMobile}
                className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white transition-opacity hover:opacity-92"
              >
                Contact for demo
              </Link>
            </div>
          </nav>
        </aside>
      </div>
    </>
  );
}
