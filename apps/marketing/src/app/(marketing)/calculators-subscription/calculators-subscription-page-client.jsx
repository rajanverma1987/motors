"use client";

import Link from "next/link";
import { FiSliders } from "react-icons/fi";
import { CALCULATOR_CATALOG } from "@/lib/calculator-catalog";
import { useCalculatorAccess } from "@/hooks/use-calculator-access";
import CalculatorAccountGate from "@/components/marketing/calculator-account-gate";

export default function CalculatorsSubscriptionPageClient() {
  const access = useCalculatorAccess();

  return (
    <div className="mx-auto max-w-[67.2rem] px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/[0.12] to-transparent p-6 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">3PhaseFlow calculators</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-title sm:text-4xl">
          Shop &amp; field calculator subscription
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          Professional motor-shop calculators, rewind cost ballparks, CM Best Match, FLA, torque, speed, and bench
          electrical helpers. Contact us to get calculator access or a full shop workspace. Self-serve portal signup is
          no longer offered on this site.
        </p>

        <CalculatorAccountGate pricing={access.pricing} />
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-title">
          <FiSliders className="h-5 w-5 text-primary" aria-hidden />
          Included calculators
        </h2>
        <p className="mt-2 text-sm text-secondary">
          Explore public tools like the{" "}
          <Link href="/electric-motor-rewinding-cost-calculator" className="font-medium text-primary hover:underline">
            rewind cost calculator
          </Link>
          . Full calculator suites are provisioned with your shop.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {CALCULATOR_CATALOG.map((item) => (
            <li
              key={item.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm dark:shadow-black/20"
            >
              <h3 className="font-semibold text-title">{item.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-secondary">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.href ? (
                  <Link href={item.href} className="text-xs font-medium text-primary hover:underline">
                    Related guide
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-muted/30 p-5 dark:bg-muted/15">
        <h2 className="text-lg font-semibold text-title">Public rewind cost calculator</h2>
        <p className="mt-2 text-sm text-secondary">
          On the{" "}
          <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
            motor repair &amp; rewinding cost guide
          </Link>
          , visitors can pay a one-time fee to unlock the exact ballpark range for one motor configuration, that option is
          only on that page, not here.
        </p>
        <Link
          href="/cost-of-motor-repair-and-rewinding#motor-rewind-cost-calculator"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Go to cost guide calculator →
        </Link>
      </section>

    </div>
  );
}
