"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/motor-repair-marketplace", label: "For shops" },
  { href: "/careers", label: "Careers" },
  { href: "/iqwirecalculator", label: "IQWireCalculator" },
  { href: "/motor-maintenance-and-repair", label: "IQMotorTrack" },
];

function navLinkClass(pathname, href) {
  const active =
    pathname === href ||
    (href === "/blog" && pathname.startsWith("/blog")) ||
    (href === "/marketplace" && pathname.startsWith("/marketplace/")) ||
    (href === "/motor-repair-marketplace" && pathname.startsWith("/motor-repair-marketplace")) ||
    (href === "/careers" && pathname.startsWith("/careers")) ||
    (href === "/iqwirecalculator" && pathname.startsWith("/iqwirecalculator")) ||
    (href === "/motor-maintenance-and-repair" && pathname.startsWith("/motor-maintenance-and-repair"));
  return `rounded-md px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation min-h-11 inline-flex items-center ${
    active ? "bg-bg text-primary" : "text-secondary hover:bg-bg hover:text-text"
  }`;
}

export default function FooterNavLinks() {
  const pathname = usePathname();
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1 sm:justify-start"
      aria-label="Blog, marketplace, shops, careers, IQWireCalculator, and IQMotorTrack"
    >
      {NAV_LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className={navLinkClass(pathname, href)}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
