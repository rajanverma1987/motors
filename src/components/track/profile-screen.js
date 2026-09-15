"use client";

import { useEffect, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { IQMOTORTRACK_FREE_MOTOR_LIMIT, IQMOTORTRACK_MONTHLY_USD } from "@/lib/iqmotortrack-marketing";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackPaypalSubscribeModal from "./paypal-subscribe";

export default function TrackProfileScreen() {
  const confirm = useConfirm();
  const toast = useToast();
  const { session, logout, refreshSession, token } = useTrackAuth();
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    refreshSession().catch(() => {});
  }, [refreshSession]);

  const cancelSub = async () => {
    const ok = await confirm({
      title: "Cancel Pro subscription",
      message: "You keep Pro until the current period ends. You will not be billed again.",
      confirmLabel: "Cancel subscription",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch("/api/track/subscription", { token, method: "DELETE" });
      await refreshSession();
      toast.success("Subscription will cancel at period end.");
    } catch (err) {
      toast.error(err.message || "Could not cancel.");
    }
  };

  const planVariant = session?.isPro ? "success" : "default";
  const planLabel = session?.isPro ? "Pro" : "Free";
  const ends = session?.currentPeriodEndsAt
    ? new Date(session.currentPeriodEndsAt).toLocaleDateString()
    : "";

  return (
    <div className="space-y-4 px-4 pb-6 pt-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Facility</p>
        <h2 className="mt-1 text-lg font-extrabold text-title">{session?.facilityName || "Facility"}</h2>
        <p className="mt-1 text-sm text-secondary">{session?.contactName}</p>
        <p className="text-sm text-secondary">{session?.email}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={planVariant} className="rounded-full px-2.5 py-0.5 text-xs">
            {planLabel}
          </Badge>
          <span className="text-xs text-secondary">{session?.usageLabel}</span>
        </div>
        {session?.isPro && ends ? (
          <p className="mt-2 text-xs text-secondary">
            {session.cancelAtPeriodEnd ? `Cancels ${ends}` : `Renews around ${ends}`}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-semibold text-title">Billing</h3>
        <p className="mt-1 text-sm text-secondary">
          Free: up to {IQMOTORTRACK_FREE_MOTOR_LIMIT} motors. Pro: ${IQMOTORTRACK_MONTHLY_USD}/month via PayPal,
          unlimited motors.
        </p>
        {!session?.isPro ? (
          <Button type="button" className="mt-3 w-full" onClick={() => setPayOpen(true)}>
            Upgrade to Pro with PayPal
          </Button>
        ) : (
          <Button type="button" variant="outline" className="mt-3 w-full" onClick={cancelSub}>
            Cancel subscription
          </Button>
        )}
        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-semibold text-primary"
          onClick={() => refreshSession().catch(() => {})}
        >
          Already paid? Refresh access
        </button>
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={logout}>
        <FiLogOut className="h-4 w-4 shrink-0" aria-hidden />
        Sign out
      </Button>

      <TrackPaypalSubscribeModal open={payOpen} onClose={() => setPayOpen(false)} />
    </div>
  );
}
