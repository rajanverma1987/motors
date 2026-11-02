"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

const DEFAULT_PRICING = {
  singleUseUsd: 5,
  monthlyUsd: 0,
  monthlyPlanName: "Calculators",
  paypalConfigured: false,
  monthlyPlanConfigured: false,
};

export function useCalculatorAccess() {
  const { user, mounted } = useAuth();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState({
    authenticated: false,
    hasAccess: false,
    hasDashboardAccess: false,
    fullCrmIncludesCalculators: false,
    calculatorOnlyTier: false,
    showCalculatorPaywall: false,
    accessMode: "none",
    credits: 0,
    subscriptionExpiresAt: null,
    accountEmail: "",
    pricing: DEFAULT_PRICING,
    loginUrl: "/login?next=%2Fcalculators-subscription&intent=calculators",
    registerUrl: "/register?next=%2Fcalculators-subscription&intent=calculators",
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [accessRes, pricingRes] = await Promise.all([
        fetch("/api/calculators/access", { credentials: "include", cache: "no-store" }),
        fetch("/api/calculators/pricing", { cache: "no-store" }),
      ]);
      const data = await accessRes.json();
      let pricing = DEFAULT_PRICING;
      try {
        const pricingData = await pricingRes.json();
        if (pricingRes.ok && pricingData) pricing = { ...DEFAULT_PRICING, ...pricingData };
      } catch {
        /* use access pricing if present */
      }
      if (accessRes.status === 401) {
        setAccess({
          authenticated: false,
          hasAccess: false,
          hasDashboardAccess: false,
          fullCrmIncludesCalculators: false,
          calculatorOnlyTier: false,
          showCalculatorPaywall: false,
          accessMode: "none",
          credits: 0,
          subscriptionExpiresAt: null,
          accountEmail: "",
          pricing: data.pricing ? { ...DEFAULT_PRICING, ...data.pricing } : pricing,
          loginUrl: data.loginUrl || "/login?intent=calculators",
          registerUrl: data.registerUrl || "/register?intent=calculators",
        });
        return;
      }
      if (accessRes.ok) {
        setAccess({
          authenticated: data.authenticated !== false,
          hasAccess: !!data.hasAccess,
          hasDashboardAccess: !!data.hasDashboardAccess,
          fullCrmIncludesCalculators: data.fullCrmIncludesCalculators === true,
          calculatorOnlyTier: !!data.calculatorOnlyTier,
          showCalculatorPaywall: !!data.showCalculatorPaywall,
          accessMode: data.accessMode || "none",
          credits: Number(data.credits) || 0,
          subscriptionExpiresAt: data.subscriptionExpiresAt || null,
          accountEmail: data.accountEmail || "",
          pricing: data.pricing ? { ...DEFAULT_PRICING, ...data.pricing } : pricing,
          loginUrl: data.loginUrl || "/login?intent=calculators",
          registerUrl: data.registerUrl || "/register?intent=calculators",
        });
      }
    } catch {
      /* keep prior */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    refresh();
  }, [refresh, mounted, user?.email]);

  const isSubscription = access.accessMode === "subscription" || access.accessMode === "bypass";

  return { ...access, loading, refresh, isSubscription };
}
