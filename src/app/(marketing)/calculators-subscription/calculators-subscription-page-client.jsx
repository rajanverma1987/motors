"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiCheck, FiSliders } from "react-icons/fi";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { CALCULATOR_CATALOG } from "@/lib/calculator-catalog";
import { useCalculatorAccess } from "@/hooks/use-calculator-access";
import CalculatorPaywallModal from "@/components/marketing/calculator-paywall-modal";
import CalculatorAccountGate from "@/components/marketing/calculator-account-gate";
import { useAuth } from "@/contexts/auth-context";

export default function CalculatorsSubscriptionPageClient() {
  const { user } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const access = useCalculatorAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "monthly" && searchParams.get("success") === "1") {
      (async () => {
        try {
          const res = await fetch("/api/calculators/subscription/activate-return", {
            method: "POST",
            credentials: "include",
          });
          if (res.ok) {
            toast.success("Monthly calculators access is active.");
            await access.refresh();
          } else {
            toast.info("Payment received — access may take a minute to activate.");
            await access.refresh();
          }
        } catch {
          await access.refresh();
        }
      })();
    } else if (checkout === "cancel") {
      toast.info("Checkout cancelled.");
    } else if (checkout === "failed") {
      toast.error("Payment could not be completed. Try again or contact support.");
    }
  }, [searchParams, toast, access]);

  return (
    <div className="mx-auto max-w-[67.2rem] px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/[0.12] to-transparent p-6 sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">IQMotorBase calculators</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-title sm:text-4xl">
          Shop &amp; field calculator subscription
        </h1>
        <p className="mt-3 max-w-2xl text-secondary">
          Professional motor-shop calculators—rewind cost ballparks, CM Best Match, FLA, torque, speed, and bench
          electrical helpers. Sign up for a <strong className="text-title">calculators-only account</strong> (not full
          CRM), then subscribe monthly. After login you use only the Calculators area of IQMotorBase.
        </p>

        <CalculatorAccountGate pricing={access.pricing} onRegistered={() => setPaywallOpen(true)}>
          {user && access.authenticated && access.hasDashboardAccess ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">
                <FiCheck className="h-4 w-4 shrink-0" aria-hidden />
                Monthly calculators access active
              </span>
              <Link href="/dashboard/calculators" className="text-sm font-medium text-primary hover:underline">
                Open dashboard calculators →
              </Link>
            </div>
          ) : user &&
            access.authenticated &&
            (access.calculatorOnlyTier || user.calculatorOnlyAccount) ? (
            <div className="mt-6">
              <Button type="button" variant="primary" size="md" onClick={() => setPaywallOpen(true)}>
                Subscribe
                {access.pricing.monthlyUsd > 0
                  ? ` — $${access.pricing.monthlyUsd.toFixed(2)}/month`
                  : ""}
                {access.pricing.monthlyPlanName ? ` (${access.pricing.monthlyPlanName})` : ""}
              </Button>
            </div>
          ) : user && access.authenticated && access.fullCrmIncludesCalculators ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href="/dashboard/calculators" className="text-sm font-medium text-primary hover:underline">
                Open dashboard calculators (included with your shop account) →
              </Link>
            </div>
          ) : null}
        </CalculatorAccountGate>
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-title">
          <FiSliders className="h-5 w-5 text-primary" aria-hidden />
          Included calculators
        </h2>
        <p className="mt-2 text-sm text-secondary">
          Previews of each tab in{" "}
          <Link href="/dashboard/calculators" className="font-medium text-primary hover:underline">
            Dashboard → Calculators
          </Link>
          . Log in to run them after you subscribe.
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
          , visitors can pay a one-time fee to unlock the exact ballpark range for one motor configuration—that option is
          only on that page, not here.
        </p>
        <Link
          href="/cost-of-motor-repair-and-rewinding#motor-rewind-cost-calculator"
          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
        >
          Go to cost guide calculator →
        </Link>
      </section>

      {user ? (
        <CalculatorPaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          showSingleUse={false}
          pricing={{ ...access.pricing, loginUrl: access.loginUrl, registerUrl: access.registerUrl }}
        />
      ) : null}
    </div>
  );
}
