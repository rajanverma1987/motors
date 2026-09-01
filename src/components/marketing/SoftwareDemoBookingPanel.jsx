"use client";

import { FiCalendar, FiCheckCircle } from "react-icons/fi";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";

const DEMO_BENEFITS = [
  "15-minute live walkthrough on your shop's terms",
  "Custom pricing, monthly, yearly, or one-time",
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
      submitLabel="Book a demo"
      variant="prominent"
      idPrefix={idPrefix}
      footerNote="We'll follow up within one business day. Prefer email? "
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
              Free walkthrough
            </p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-title sm:text-3xl lg:text-4xl">
              Book a live demo
            </h2>
            <p className="mt-3 text-base leading-relaxed text-secondary sm:text-lg">
              No self-serve signup or public rate card: pricing is matched to how your motor shop runs. Tell us who
              you are and we&apos;ll show the Job Write-Up path on a call.
            </p>
            <BenefitList className="mt-6 sm:mt-8" />
          </div>
          <div className="bg-card px-6 py-8 sm:px-8 sm:py-10">{form}</div>
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
          Free walkthrough
        </p>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-title sm:text-2xl">Book a live demo</h2>
        <p className="mt-2 text-sm leading-relaxed text-secondary sm:text-base">
          Custom pricing for your shop&apos;s workflow. See Job Write-Ups, work orders, inventory, and leads in one
          system.
        </p>
      </div>
      <div className="border-b border-border/80 px-5 py-5 sm:px-6">
        <BenefitList />
      </div>
      <div className="px-5 py-6 sm:px-6 sm:py-7">{form}</div>
    </div>
  );
}
