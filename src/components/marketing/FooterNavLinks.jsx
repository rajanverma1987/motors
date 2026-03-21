"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/motor-repair-marketplace", label: "For shops" },
  { href: "/careers", label: "Careers" },
];

function navLinkClass(pathname, href) {
  const active =
    pathname === href ||
    (href === "/marketplace" && pathname.startsWith("/marketplace/")) ||
    (href === "/motor-repair-marketplace" && pathname.startsWith("/motor-repair-marketplace")) ||
    (href === "/careers" && pathname.startsWith("/careers"));
  return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active ? "bg-bg text-primary" : "text-secondary hover:bg-bg hover:text-text"
  }`;
}

export default function FooterNavLinks() {
  const pathname = usePathname();
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1"
      aria-label="Marketplace, shops, and careers"
    >
      {NAV_LINKS.map(({ href, label }) => (
        <Link key={href} href={href} className={navLinkClass(pathname, href)}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
