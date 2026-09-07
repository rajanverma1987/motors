"use client";

import { useEffect, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { appFetch } from "./api";
import { useIqwireAuth } from "./auth-context";
import PaypalSubscribeModal from "./paypal-subscribe";

function statusCopy(account) {
  if (!account) return "";
  if (account.accessMode === "trial") {
    const ends = account.trialEndsAt ? new Date(account.trialEndsAt).toLocaleDateString() : "";
    return `Free trial until ${ends}`;
  }
  if (account.accessMode === "subscription") {
    const ends = account.currentPeriodEndsAt ? new Date(account.currentPeriodEndsAt).toLocaleDateString() : "";
    const cycle = account.plan?.billingCycle === "yearly" ? "Yearly" : "Monthly";
    return `Active ${cycle}. Renews around ${ends}`;
  }
  if (account.accessMode === "cancelled_until_period_end") {
    const ends = account.currentPeriodEndsAt ? new Date(account.currentPeriodEndsAt).toLocaleDateString() : "";
    return `Cancels ${ends}`;
  }
  if (account.accessMode === "grace") return "Payment issue. Access continues during a short grace period.";
  return "Locked. Subscribe to continue.";
}

function statusVariant(account) {
  if (!account) return "default";
  if (account.accessMode === "subscription") return "success";
  if (account.accessMode === "trial") return "warning";
  if (account.accessMode === "grace" || account.accessMode === "cancelled_until_period_end") return "warning";
  return "danger";
}

export default function ProfileScreen() {
  const confirm = useConfirm();
  const toast = useToast();
  const { account, updateProfile, logout, refreshAccount, token } = useIqwireAuth();
  const [name, setName] = useState(account?.name || "");
  const [companyName, setCompanyName] = useState(account?.companyName || "");
  const [phone, setPhone] = useState(account?.phone || "");
  const [saving, setSaving] = useState(false);
  const [cycle, setCycle] = useState("monthly");
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    setName(account?.name || "");
    setCompanyName(account?.companyName || "");
    setPhone(account?.phone || "");
  }, [account?.name, account?.companyName, account?.phone]);

  useEffect(() => {
    refreshAccount().catch(() => {});
  }, [refreshAccount]);

  const monthly = Number(account?.plans?.monthly?.usd || 11.99);
  const yearly = Number(account?.plans?.yearly?.usd || 119);
  const subscribed =
    account?.unlocked &&
    (account?.accessMode === "subscription" || account?.accessMode === "cancelled_until_period_end");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ name, companyName, phone });
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const cancelSub = async () => {
    const ok = await confirm({
      title: "Cancel subscription",
      message: "You keep access until the current period ends. You will not be billed again.",
      confirmLabel: "Cancel subscription",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch("/api/mobile-app/subscription", { token, method: "DELETE" });
      await refreshAccount();
      toast.success("Subscription will cancel at period end.");
    } catch (err) {
      toast.error(err.message || "Could not cancel.");
    }
  };

  return (
    <div className="space-y-4 px-4 pb-6 pt-3">
      <Form id="iqwire-profile-form" onSubmit={save} className="space-y-4">
        <Input label="Name" name="profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Company name"
          name="profile-company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          autoComplete="organization"
        />
        <Input label="Phone" name="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" name="profile-email" value={account?.email || ""} readOnly />
        <Button type="submit" form="iqwire-profile-form" disabled={saving} className="w-full">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </Form>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-title">Subscription</h2>
          <Badge variant={statusVariant(account)} className="rounded-full px-2.5 py-0.5 text-xs">
            {account?.accessMode === "trial"
              ? "Trial"
              : account?.unlocked
                ? account?.accessMode === "cancelled_until_period_end"
                  ? "Cancelling"
                  : "Active"
                : "Locked"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-secondary">{statusCopy(account)}</p>
        <p className="mt-1 text-xs text-secondary">3-day free trial on new accounts.</p>

        {subscribed ? (
          account?.cancelAtPeriodEnd ? (
            <p className="mt-3 text-sm text-secondary">Already set to cancel at period end.</p>
          ) : (
            <Button type="button" variant="danger" size="sm" className="mt-4" onClick={cancelSub}>
              Cancel subscription
            </Button>
          )
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCycle("monthly")}
                className={`rounded-xl border px-3 py-3 text-left text-sm ${
                  cycle === "monthly" ? "border-primary bg-primary/10 font-semibold text-title" : "border-border text-secondary"
                }`}
              >
                ${monthly.toFixed(2)}
                <span className="mt-0.5 block text-xs font-normal">per month</span>
              </button>
              <button
                type="button"
                onClick={() => setCycle("yearly")}
                className={`rounded-xl border px-3 py-3 text-left text-sm ${
                  cycle === "yearly" ? "border-primary bg-primary/10 font-semibold text-title" : "border-border text-secondary"
                }`}
              >
                ${yearly.toFixed(2)}
                <span className="mt-0.5 block text-xs font-normal">per year</span>
              </button>
            </div>
            <Button type="button" className="mt-3 w-full" onClick={() => setPayOpen(true)}>
              Subscribe with PayPal
            </Button>
          </>
        )}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={logout}>
        <FiLogOut className="h-4 w-4 shrink-0" aria-hidden />
        Sign out
      </Button>
      <PaypalSubscribeModal open={payOpen} onClose={() => setPayOpen(false)} billingCycle={cycle} />
    </div>
  );
}
