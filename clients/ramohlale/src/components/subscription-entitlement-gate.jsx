"use client";

import { useEffect, useState } from "react";
import SubscriptionGraceBanner from "@/components/subscription-grace-banner";

/**
 * Daily subscription check via same-origin server route (no public tenant key).
 */
export default function SubscriptionEntitlementGate({ children }) {
  const [entitlement, setEntitlement] = useState(null);

  useEffect(() => {
    const key = "3pf_entitlement_cache_v2";
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.checkedAt && Date.now() - new Date(parsed.checkedAt).getTime() < 24 * 60 * 60 * 1000) {
          setEntitlement(parsed.entitlement || parsed);
          return;
        }
      } catch {
        /* refresh */
      }
    }
    (async () => {
      try {
        const res = await fetch("/api/dashboard/subscription-entitlement", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const ent = data.entitlement || { access: "full", grace: false, paywall: false, notice: null };
        localStorage.setItem(
          key,
          JSON.stringify({ entitlement: ent, checkedAt: data.checkedAt || new Date().toISOString() })
        );
        setEntitlement(ent);
      } catch {
        setEntitlement({ access: "full", grace: false, paywall: false, notice: null });
      }
    })();
  }, []);

  if (!entitlement) return children;

  if (entitlement.paywall) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-title">Subscription required</h1>
        <p className="mt-2 text-secondary">{entitlement.notice}</p>
      </div>
    );
  }

  return (
    <>
      {entitlement.grace ? <SubscriptionGraceBanner notice={entitlement.notice} /> : null}
      {children}
    </>
  );
}
