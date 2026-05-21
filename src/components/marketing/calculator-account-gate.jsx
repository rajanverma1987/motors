"use client";

import { useState } from "react";
import Link from "next/link";
import { FiCheck, FiLogIn, FiSliders, FiUserPlus } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import CalculatorOnlyRegisterModal from "@/components/marketing/calculator-only-register-modal";
import {
  calculatorAuthUrls,
  CALCULATOR_EXISTING_ACCOUNT_MESSAGE,
  CALCULATORS_SUBSCRIBE_PATH,
} from "@/lib/calculator-auth-flow";

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
          Access tied to your email—use on any device after you log in
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
 * Requires a calculators-only portal account before monthly subscription checkout.
 */
export default function CalculatorAccountGate({
  children,
  nextPath = CALCULATORS_SUBSCRIBE_PATH,
  pricing,
  onRegistered,
}) {
  const { user, mounted } = useAuth();
  const urls = calculatorAuthUrls(nextPath);
  const [registerOpen, setRegisterOpen] = useState(false);

  if (!mounted) {
    return (
      <div className="mt-6 py-10 text-center text-sm text-secondary">Loading…</div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="mt-6 space-y-5">
          <CalculatorPricingCard pricing={pricing} />

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <FiSliders className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold text-title sm:text-xl">Create your calculators account</h2>
              <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                Calculators only
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
              This page is for a <strong className="text-title">calculators-only subscription</strong>—not the full
              IQMotorBase repair-shop CRM. You will only get the Calculators workspace after login, not customers, work
              orders, inventory, or other dashboard modules.
            </p>
            <p className="mt-2 text-sm text-secondary">
              Need the full shop system?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Register your repair center
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="font-medium text-primary hover:underline">
                contact us for a demo
              </Link>
              .
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col rounded-xl border border-primary/30 bg-primary/[0.05] p-4 sm:p-5">
                <div className="flex items-center gap-2 text-title">
                  <FiUserPlus className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <h3 className="font-semibold">New here?</h3>
                </div>
                <p className="mt-2 flex-1 text-sm text-secondary">
                  Create a calculators-only account with the email you will use for billing, then subscribe on this
                  page.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="mt-4 w-full sm:w-auto"
                  onClick={() => setRegisterOpen(true)}
                >
                  Create calculators account
                </Button>
              </div>

              <div className="flex flex-col rounded-xl border border-border bg-muted/25 p-4 sm:p-5 dark:bg-muted/10">
                <div className="flex items-center gap-2 text-title">
                  <FiLogIn className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <h3 className="font-semibold">Already have an account?</h3>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-secondary">
                  {CALCULATOR_EXISTING_ACCOUNT_MESSAGE}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={urls.loginUrl}>
                    <Button type="button" variant="secondary" size="sm">
                      Log in
                    </Button>
                  </Link>
                  <Link
                    href="/contact"
                    className="self-center text-sm font-medium text-primary hover:underline"
                  >
                    Reset password
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CalculatorOnlyRegisterModal
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          nextPath={nextPath}
          onRegistered={onRegistered}
        />
      </>
    );
  }

  return <>{children}</>;
}
