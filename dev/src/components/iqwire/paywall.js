"use client";

import { useState } from "react";
import { FiLock } from "react-icons/fi";
import Button from "@/components/ui/button";
import { useIqwireAuth } from "./auth-context";
import PaypalSubscribeModal from "./paypal-subscribe";

export default function PaywallOverlay() {
  const { account, refreshAccount, logout } = useIqwireAuth();
  const [cycle, setCycle] = useState("monthly");
  const [open, setOpen] = useState(false);

  if (!account || account.unlocked) return null;

  const monthly = Number(account.plans?.monthly?.usd || account.plan?.monthlyUsd || 11.99);
  const yearly = Number(account.plans?.yearly?.usd || 119);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
          <FiLock className="h-6 w-6 shrink-0" aria-hidden />
        </div>
        <h2 className="text-xl font-extrabold text-title">Your free trial ended</h2>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          Subscribe with PayPal to keep CM Best Match, saves, and print.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-xl border px-3 py-3 text-sm ${
              cycle === "monthly" ? "border-primary bg-primary/10 font-semibold text-title" : "border-border text-secondary"
            }`}
          >
            ${monthly.toFixed(2)}
            <span className="mt-0.5 block text-xs font-normal">per month</span>
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`rounded-xl border px-3 py-3 text-sm ${
              cycle === "yearly" ? "border-primary bg-primary/10 font-semibold text-title" : "border-border text-secondary"
            }`}
          >
            ${yearly.toFixed(2)}
            <span className="mt-0.5 block text-xs font-normal">per year</span>
          </button>
        </div>
        <Button type="button" className="mt-4 w-full" onClick={() => setOpen(true)}>
          Subscribe with PayPal
        </Button>
        <button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={() => refreshAccount().catch(() => {})}>
          Already paid? Refresh access
        </button>
        <button type="button" className="mt-2 block w-full text-sm text-secondary" onClick={logout}>
          Sign out
        </button>
      </div>
      <PaypalSubscribeModal open={open} onClose={() => setOpen(false)} billingCycle={cycle} />
    </div>
  );
}
