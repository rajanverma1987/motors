"use client";

import { FiCalendar, FiCheckCircle } from "react-icons/fi";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import DemoBookingLink from "@/components/marketing/demo-booking-link";

const DEMO_BENEFITS = [
  "Free 30-minute live walkthrough on your shop's terms",
  "$349/mo or $3,235/yr, unlimited users, full platform",
  "Migration help for customers, motors, and job history",
  "See Job Write-Ups, work orders, inventory, and leads together",
];

function BenefitList({ className = "" }) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {DEMO_BENEFITS.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-snug text-secondary sm:text-base">
          <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CalendarPrimaryCta({ className = "" }) {
  return (
    <DemoBookingLink
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-92 ${className}`}
    >
      <FiCalendar className="h-4 w-4 shrink-0" aria-hidden />
      Pick a time on my calendar
    </DemoBookingLink>
  );
}

/**
 * Prominent demo booking block for software SEO pages.
 * @param {"sidebar"|"inline"} layout, sidebar card (sticky column) or full-width inline CTA
 */
export default function SoftwareDemoBookingPanel({
  sourcePage,
  layout = "sidebar",
  idPrefix = "software-demo",
  className = "",
}) {
  const form = (
    <SeoLeadMiniForm
      sourcePage={sourcePage}
      submitLabel="Or request a callback"
      variant="prominent"
      idPrefix={idPrefix}
      footerNote="Prefer email? "
      showCalendarCta={false}
    />
  );

  if (layout === "inline") {
    return (
      <div
        id="book-a-demo"
        className={`overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.12] via-card to-card shadow-lg ${className}`}
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="border-b border-primary/15 bg-primary/[0.08] px-6 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r">
            <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <FiCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Free 30-min demo
            </p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-title sm:text-3xl lg:text-4xl">
              Book a free demo
            </h2>
            <p className="mt-3 text-base leading-relaxed text-secondary sm:text-lg">
              Starts at $349/month or $3,235/year. Pick a time below. We will show the Job Write-Up path and answer
              every question before you decide.
            </p>
            <BenefitList className="mt-6 sm:mt-8" />
            <CalendarPrimaryCta className="mt-6" />
          </div>
          <div className="bg-card px-6 py-8 sm:px-8 sm:py-10">
            <p className="mb-4 text-sm font-medium text-secondary">
              Or leave your details and we will follow up:
            </p>
            {form}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="book-a-demo"
      className={`overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.1] via-card to-card shadow-lg ${className}`}
    >
      <div className="border-b border-primary/15 bg-primary/[0.08] px-5 py-6 sm:px-6 sm:py-7">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <FiCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Free 30-min demo
        </p>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-title sm:text-2xl">Book a free demo</h2>
        <p className="mt-2 text-sm leading-relaxed text-secondary sm:text-base">
          $349/mo or $3,235/yr. See Job Write-Ups, work orders, inventory, and leads in one system.
        </p>
        <CalendarPrimaryCta className="mt-4" />
      </div>
      <div className="border-b border-border/80 px-5 py-5 sm:px-6">
        <BenefitList />
      </div>
      <div className="px-5 py-6 sm:px-6 sm:py-7">
        <p className="mb-4 text-sm font-medium text-secondary">Or leave your details:</p>
        {form}
      </div>
    </div>
  );
}
