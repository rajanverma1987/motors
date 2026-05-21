"use client";

import Link from "next/link";
import { FiLock } from "react-icons/fi";
import Button from "@/components/ui/button";
import { useCalculatorAccess } from "@/hooks/use-calculator-access";
import CalculatorPaywallModal from "@/components/marketing/calculator-paywall-modal";
import CalculatorAccountGate from "@/components/marketing/calculator-account-gate";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";

/**
 * Paywall for calculator-only portal accounts without an active calculators subscription.
 * Full CRM shops always pass through (calculators included).
 */
export default function CalculatorSubscriptionGate({ children }) {
  const { user } = useAuth();
  const access = useCalculatorAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (access.loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-sm text-secondary">
        Checking calculator access…
      </div>
    );
  }

  if (!user) {
    return <CalculatorAccountGate nextPath="/dashboard/calculators" />;
  }

  const calcOnlyPortal = !!(user?.calculatorOnlyAccount || access.calculatorOnlyTier);

  if (access.fullCrmIncludesCalculators || access.hasDashboardAccess) {
    return <>{children}</>;
  }

  if (!calcOnlyPortal) {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center shadow-sm">
      <FiLock className="h-10 w-10 text-primary" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold text-title">Calculators subscription required</h2>
      <p className="mt-2 text-sm text-secondary">
        Logged in as <span className="font-medium text-title">{access.accountEmail || user.email}</span>. Subscribe to
        unlock CM Best Match, power &amp; FLA, speed, torque, bench electrical, and the rewind cost model.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="primary" size="sm" onClick={() => setPaywallOpen(true)}>
          Subscribe
          {access.pricing.monthlyUsd > 0 ? ` — $${access.pricing.monthlyUsd.toFixed(2)}/mo` : ""}
        </Button>
      </div>
      <Link href="/calculators-subscription" className="mt-4 text-sm font-medium text-primary hover:underline">
        View all calculators &amp; pricing →
      </Link>
      <CalculatorPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        showSingleUse={false}
        nextPath="/dashboard/calculators"
        pricing={{ ...access.pricing, loginUrl: access.loginUrl, registerUrl: access.registerUrl }}
      />
    </div>
  );
}
