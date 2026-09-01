"use client";

import { useState } from "react";
import Link from "next/link";
import { FiCheck } from "react-icons/fi";
import Button from "@/components/ui/button";

const FOUNDER_SPOTS_TOTAL = 10;
const FOUNDER_SPOTS_TAKEN = 1;
const FOUNDER_SPOTS_LEFT = FOUNDER_SPOTS_TOTAL - FOUNDER_SPOTS_TAKEN;

const STANDARD_FEATURES = [
  "Digital job write-ups with motor nameplate data",
  "Work order tracking: intake to delivery",
  "Customer and motor history registry",
  "Shop inventory management",
  "Invoicing and accounts receivable",
  "Vendor POs and accounts payable",
  "QuickBooks Online sync",
  "Lead generation directory listing",
  "Marketplace and careers board",
  "Unlimited users",
  "API access",
  "Technician mobile app, coming soon",
];

const FOUNDER_FEATURES = [
  "Everything in Standard; nothing removed",
  "Permanently locked rate, guaranteed for life",
  "Priority onboarding and setup support",
  "Direct access to the founding team",
  "Input on product roadmap and new features",
  "Founder badge on your directory listing",
];

export { FOUNDER_SPOTS_LEFT, FOUNDER_SPOTS_TOTAL };

export default function PricingCardsClient() {
  const [billing, setBilling] = useState("annual");

  const scrollToContact = () => {
    document.getElementById("pricing-contact-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.dispatchEvent(new CustomEvent("pricing-contact-type", { detail: "founder" }));
  };

  return (
    <>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors touch-manipulation ${
              billing === "monthly"
                ? "bg-card text-title shadow-sm"
                : "text-secondary hover:text-title"
            }`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors touch-manipulation ${
              billing === "annual"
                ? "bg-card text-title shadow-sm"
                : "text-secondary hover:text-title"
            }`}
            onClick={() => setBilling("annual")}
          >
            Annual
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
              Save $983
            </span>
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <h2 className="text-xl font-bold text-title">Standard</h2>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-bold tabular-nums text-title">
              {billing === "monthly" ? "$349" : "$269"}
            </span>
            <span className="text-secondary">/month</span>
          </div>
          {billing === "annual" ? (
            <p className="mt-1 text-sm text-secondary">Billed as $3,235/year</p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            Full platform for your motor repair shop. Everything you need from day one.
          </p>
          <ul className="mt-5 space-y-2.5">
            {STANDARD_FEATURES.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-secondary">
                <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/contact" className="mt-6 block">
            <Button type="button" variant="primary" size="lg" className="w-full">
              Book a free demo →
            </Button>
          </Link>
          <p className="mt-2 text-center text-xs text-secondary">
            20 minutes. No pressure. See if it fits your shop.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-warning/50 bg-warning/5 p-6 shadow-sm sm:p-7">
          <span className="inline-block rounded-full bg-warning px-3 py-1 text-xs font-bold text-white">
            Limited: {FOUNDER_SPOTS_LEFT} of {FOUNDER_SPOTS_TOTAL} spots left
          </span>
          <h2 className="mt-4 text-xl font-bold text-title">Founder Pricing</h2>
          <div className="mt-3 flex items-baseline gap-1">
            <span
              className="select-none text-4xl font-bold tabular-nums text-warning blur-[6px]"
              aria-hidden
            >
              ••••
            </span>
            <span className="text-secondary">/month</span>
          </div>
          <p className="mt-1 text-sm font-medium text-title">Permanently locked. Your rate never increases</p>
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            A significantly discounted rate locked in for life for the first {FOUNDER_SPOTS_TOTAL} shops that join
            IQMotorBase. Contact us to check availability and get your exclusive rate.
          </p>
          <ul className="mt-5 space-y-2.5">
            {FOUNDER_FEATURES.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-secondary">
                <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="mt-6 w-full bg-warning hover:opacity-90"
            onClick={scrollToContact}
          >
            Request founder pricing →
          </Button>
          <p className="mt-2 text-center text-xs text-warning">
            {FOUNDER_SPOTS_LEFT} spots remaining. No obligation to ask.
          </p>
        </div>
      </div>

      <div className="mb-10 flex flex-col items-start gap-4 rounded-xl border border-warning/30 bg-warning/5 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div className="flex shrink-0 gap-1.5" aria-hidden>
          {Array.from({ length: FOUNDER_SPOTS_TOTAL }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full ${
                i < FOUNDER_SPOTS_TAKEN ? "bg-warning" : "border border-border bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-secondary">
          <strong className="text-title">{FOUNDER_SPOTS_LEFT} founder spots remaining</strong>. Once filled,
          pricing returns to standard rate permanently.
        </p>
      </div>
    </>
  );
}
