"use client";

import Link from "next/link";
import { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import { calculatorAuthUrls, CALCULATORS_SUBSCRIBE_PATH } from "@/lib/calculator-auth-flow";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.nextPath]
 * @param {boolean} [props.showSingleUse] — cost guide only; subscription page is monthly-only
 * @param {boolean} [props.allowGuestSingleUse] — cost guide: PayPal $5 without registration
 * @param {{ singleUseUsd: number, monthlyUsd: number, monthlyPlanName?: string, loginUrl?: string, registerUrl?: string, paypalConfigured: boolean, monthlyPlanConfigured: boolean }} props.pricing
 */
export default function CalculatorPaywallModal({
  open,
  onClose,
  nextPath = CALCULATORS_SUBSCRIBE_PATH,
  pricing,
  showSingleUse = true,
  allowGuestSingleUse = false,
}) {
  const toast = useToast();
  const { user, mounted } = useAuth();
  const [busy, setBusy] = useState("");
  const urls = calculatorAuthUrls(nextPath);

  const singleUsd = Number(pricing?.singleUseUsd) || 5;
  const monthlyUsd = Number(pricing?.monthlyUsd) || 0;
  const monthlyLabel = pricing?.monthlyPlanName?.trim() || "Calculators";
  const paypalOk = !!pricing?.paypalConfigured;
  const monthlyOk = !!pricing?.monthlyPlanConfigured;
  const monthlyPlanSlug = pricing?.monthlyPlanSlug || "calc-only";
  const planFound = !!pricing?.planFound;
  const loginUrl = pricing?.loginUrl || urls.loginUrl;
  const registerUrl = pricing?.registerUrl || urls.registerUrl;

  async function startCheckout(kind) {
    const guestSingle = allowGuestSingleUse && kind === "single";
    if (!guestSingle && (!mounted || !user)) {
      toast.error("Create an account or log in before checkout.");
      onClose();
      window.location.href = registerUrl;
      return;
    }
    if (!paypalOk) {
      toast.error("Online checkout is not available yet. Please contact support.");
      return;
    }
    setBusy(kind);
    try {
      const path =
        kind === "monthly"
          ? "/api/calculators/checkout/monthly"
          : guestSingle
            ? "/api/calculators/checkout/one-time-guest"
            : "/api/calculators/checkout/one-time";
      const res = await fetch(path, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.status === 401) {
        toast.error(data.error || "Please log in first.");
        setBusy("");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (!data.approvalUrl) throw new Error("Missing PayPal approval link");
      window.location.href = data.approvalUrl;
    } catch (e) {
      toast.error(e.message || "Checkout failed");
      setBusy("");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (busy) return;
        onClose();
      }}
      title={showSingleUse ? "Unlock calculator pricing" : "Subscribe to calculators"}
      size="md"
      zIndex={120}
    >
      <div className="flex flex-col gap-4 text-sm text-secondary">
        {allowGuestSingleUse && showSingleUse ? (
          <>
            <p>
              Pay once with PayPal to reveal the exact ballpark price range for your current motor inputs on this page.
              No account required.
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-4 dark:bg-muted/15">
              <p className="font-semibold text-title">Single use — ${singleUsd.toFixed(2)}</p>
              <p className="mt-1 text-xs leading-relaxed">
                One-time unlock for this configuration. After payment you will return here with prices visible.
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="mt-3 w-full sm:w-auto"
                disabled={!!busy}
                onClick={() => startCheckout("single")}
              >
                {busy === "single" ? "Redirecting to PayPal…" : `Pay $${singleUsd.toFixed(2)} — unlock price`}
              </Button>
            </div>
            <p className="text-xs">
              Want all shop calculators monthly?{" "}
              <a href="/calculators-subscription" className="font-medium text-primary hover:underline">
                View calculators subscription →
              </a>
            </p>
          </>
        ) : !mounted || !user ? (
          <>
            <p>Log in before payment. Your subscription is linked to your IQMotorBase account email.</p>
            <div className="flex flex-wrap gap-2">
              <Link href={loginUrl}>
                <Button type="button" variant="primary" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href={registerUrl}>
                <Button type="button" variant="secondary" size="sm">
                  Create account
                </Button>
              </Link>
            </div>
            <p className="text-xs">
              Already listed on our portal? Log in or{" "}
              <Link href="/contact" className="font-medium text-primary hover:underline">
                contact us to reset your password
              </Link>
              , then complete payment.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-secondary">
              Purchasing as <span className="font-medium text-title">{user.email}</span>
            </p>
            <p>
              {showSingleUse
                ? "Ballpark rewind prices are computed on our servers. Choose how you want to unlock results:"
                : "Monthly access includes all dashboard calculators—rewind cost, CM Best Match, FLA, torque, speed, and bench electrical tools."}
            </p>

            {showSingleUse ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 dark:bg-muted/15">
                <p className="font-semibold text-title">Single use — ${singleUsd.toFixed(2)}</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Pay once to reveal the exact price range for your current motor inputs on this page.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="mt-3 w-full sm:w-auto"
                  disabled={!!busy}
                  onClick={() => startCheckout("single")}
                >
                  {busy === "single" ? "Redirecting to PayPal…" : `Pay $${singleUsd.toFixed(2)} — unlock price`}
                </Button>
              </div>
            ) : null}

            <div className="rounded-lg border border-primary/35 bg-primary/[0.06] p-4">
              <p className="font-semibold text-title">
                {monthlyLabel}
                {monthlyUsd > 0 ? ` — $${monthlyUsd.toFixed(2)}/mo` : ""}
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                Unlimited calculator access in your dashboard, including rewind cost, CM Best Match, FLA, torque, speed,
                and bench electrical tools.
              </p>
              <Button
                type="button"
                variant={showSingleUse ? "secondary" : "primary"}
                size="sm"
                className="mt-3 w-full sm:w-auto"
                disabled={!!busy || !monthlyOk || !paypalOk}
                onClick={() => startCheckout("monthly")}
              >
                {busy === "monthly" ? "Redirecting to PayPal…" : `Subscribe — $${monthlyUsd.toFixed(2)}/month`}
              </Button>
              {!monthlyOk ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                  {!paypalOk
                    ? "PayPal checkout is not configured on this site yet."
                    : !planFound
                      ? `Add an active subscription plan with slug “${monthlyPlanSlug}” in Admin → Subscription plans.`
                      : monthlyUsd <= 0
                        ? `Set a monthly price on the “${monthlyPlanSlug}” plan in Admin → Subscription plans.`
                        : `Link the “${monthlyPlanSlug}” plan to PayPal (plan type PayPal with billing IDs, or save with PayPal credentials configured).`}
                </p>
              ) : null}
            </div>

            {showSingleUse ? (
              <p className="text-xs">
                <a href="/calculators-subscription" className="font-medium text-primary hover:underline">
                  View all calculators included in the monthly subscription →
                </a>
              </p>
            ) : null}
          </>
        )}

        <Button type="button" variant="ghost" size="sm" className="self-start" disabled={!!busy} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
