"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import PortalCustomerContent from "./portal-customer-content";
import { UserSettingsValueProvider } from "@/contexts/user-settings-context";

export default function PortalViewPage() {
  const params = useParams();
  const token = params?.token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invalid link");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Unable to load portal");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const seededSettings = useMemo(() => {
    const shop = data?.shop || {};
    return {
      currency: shop.currency || "USD",
      logoUrl: shop.logoUrl || "",
      accountsBillingAddress: shop.accountsBillingAddress || "",
      accountsShippingAddress: shop.accountsShippingAddress || "",
      accountsPaymentTerms: shop.accountsPaymentTerms || "net30",
      invoicePaymentOptions: shop.invoicePaymentOptions || "",
      invoiceThankYouNote: shop.invoiceThankYouNote || "",
    };
  }, [data?.shop]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <p className="text-sm text-secondary">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-md border border-border bg-card/40 p-6 text-center dark:bg-card/20">
          <p className="font-semibold text-danger">{error || "Portal not found"}</p>
          <p className="mt-2 text-sm text-secondary">
            This link may be invalid or expired. Please contact your repair shop for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <UserSettingsValueProvider settings={seededSettings}>
      <PortalCustomerContent data={data} />
    </UserSettingsValueProvider>
  );
}
