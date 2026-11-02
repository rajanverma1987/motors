"use client";

import Link from "next/link";
import { FiCheck, FiSliders } from "react-icons/fi";
import Badge from "@/components/ui/badge";

function CalculatorPricingCard({ pricing }) {
  const monthlyUsd = Number(pricing?.monthlyUsd) || 0;
  const planName = pricing?.monthlyPlanName?.trim() || "Calculators";
  const monthlyOk = !!pricing?.monthlyPlanConfigured;

  return (
    <div className="rounded-xl border border-primary/35 bg-primary/[0.08] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Monthly subscription</p>
          <p className="mt-1 text-lg font-semibold text-title">{planName}</p>
        </div>
        {monthlyUsd > 0 ? (
          <p className="text-2xl font-bold tabular-nums text-title">
            ${monthlyUsd.toFixed(2)}
            <span className="text-sm font-medium text-secondary"> / month</span>
          </p>
        ) : (
          <p className="text-sm text-secondary">Price shown at checkout</p>
        )}
      </div>
      <ul className="mt-4 space-y-1.5 text-xs text-secondary">
        <li className="flex gap-2">
          <FiCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          Rewind cost, CM Best Match, FLA, torque, speed, and bench electrical tools
        </li>
        <li className="flex gap-2">
          <FiCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          Included with a provisioned shop workspace, or as a calculators plan we set up for you
        </li>
      </ul>
      {!monthlyOk ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Online checkout is being set up. Contact us if you need help subscribing.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Marketing has no self-serve portal login. Point visitors to contact / demo.
 */
export default function CalculatorAccountGate({ children, pricing }) {
  return (
    <div className="mt-6 space-y-5">
      <CalculatorPricingCard pricing={pricing} />

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <FiSliders className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-title sm:text-xl">Get calculator access</h2>
          <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
            Contact us
          </Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
          Self-serve signup is no longer on this site. Contact us and we will provision calculator access or a full
          shop workspace for your team.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex min-h-9 w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 sm:w-auto"
          >
            Contact us
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:bg-form-bg"
          >
            View pricing
          </Link>
        </div>
      </div>

      {/* Keep children mounted off-flow for any parent that still expects them */}
      <div className="hidden" aria-hidden>
        {children}
      </div>
    </div>
  );
}
