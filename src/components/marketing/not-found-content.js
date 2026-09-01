import Link from "next/link";
import {
  FiArrowLeft,
  FiBookOpen,
  FiDollarSign,
  FiHome,
  FiMail,
  FiMapPin,
  FiSearch,
  FiTool,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import HeroBackground from "@/components/marketing/HeroBackground";

const POPULAR_LINKS = [
  {
    href: "/electric-motor-repair-shops-listings",
    label: "Find repair shops",
    description: "Browse certified motor repair centers by state and city.",
    icon: FiSearch,
  },
  {
    href: "/electric-motor-repair-near-me",
    label: "Repair shops near me",
    description: "Local directory for AC, DC, and industrial motor repair.",
    icon: FiMapPin,
  },
  {
    href: "/cost-of-motor-repair-and-rewinding",
    label: "Motor rewinding cost guide",
    description: "US ballpark ranges by HP, plus a free cost calculator.",
    icon: FiDollarSign,
  },
  {
    href: "/motor-repair-shop-management-software",
    label: "Shop management software",
    description: "Job write-ups, work orders, inventory, and invoicing for shops.",
    icon: FiTool,
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Plans for motor repair shops, unlimited users included.",
    icon: FiBookOpen,
  },
  {
    href: "/contact",
    label: "Book a demo",
    description: "20-minute walkthrough of IQMotorBase for shop owners.",
    icon: FiMail,
  },
];

export default function NotFoundContent() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-card py-14 sm:py-20">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/.08,transparent)]"
          aria-hidden
        />
        <HeroBackground />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p
            className="text-7xl font-bold tabular-nums tracking-tight text-primary/25 sm:text-8xl"
            aria-hidden
          >
            404
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-title sm:text-4xl">
            This page could not be found
          </h1>
          <p className="mt-4 text-base leading-relaxed text-secondary sm:text-lg">
            The link may be outdated, mistyped, or the page was moved. IQMotorBase is still here: find a
            motor repair shop, check rewinding costs, or explore shop management software below.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link href="/" className="w-full min-w-0 sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                <FiHome className="h-4 w-4 shrink-0" aria-hidden />
                Back to home
              </Button>
            </Link>
            <Link href="/electric-motor-repair-shops-listings" className="w-full min-w-0 sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <FiSearch className="h-4 w-4 shrink-0" aria-hidden />
                Find repair shops
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="not-found-links-heading">
        <h2 id="not-found-links-heading" className="text-center text-xl font-bold text-title sm:text-2xl">
          Popular pages on IQMotorBase
        </h2>
        <p className="mt-2 text-center text-sm text-secondary sm:text-base">
          For industrial buyers and motor repair shop owners.
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {POPULAR_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.04] sm:p-5"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-title group-hover:text-primary">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-secondary">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-12">
          <p className="text-sm leading-relaxed text-secondary sm:text-base">
            Need a motor repaired? Submit your motor details through our directory and get matched with shops
            that quote your HP, voltage, and application. Shop owners can{" "}
            <Link href="/list-your-electric-motor-services" className="font-medium text-primary hover:underline">
              list your center for free
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              book a platform demo
            </Link>
            .
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Return to homepage
          </Link>
        </div>
      </section>
    </>
  );
}
