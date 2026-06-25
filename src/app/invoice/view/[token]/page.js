"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import { formatMoney } from "@/lib/format-currency";

export default function InvoiceCustomerViewPage() {
  const params = useParams();
  const token = params?.token;
  const [inv, setInv] = useState(null);
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
        const res = await fetch(`/api/invoice/view?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Invoice not found");
          return;
        }
        setInv(data);
      } catch {
        if (!cancelled) setError("Failed to load invoice");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!inv || typeof window === "undefined") return;
    if (String(window.location.hash || "").toLowerCase() !== "#print") return;
    const t = window.setTimeout(() => {
      window.print();
      const path = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", path);
    }, 450);
    return () => window.clearTimeout(t);
  }, [inv]);

  const fmt = useMemo(() => {
    const code = inv?.currency || "USD";
    return (v) => formatMoney(v, code);
  }, [inv?.currency]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-600">Loading invoice…</p>
      </div>
    );
  }
  if (error || !inv) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="font-medium text-red-600">{error || "Invoice not found"}</p>
          <p className="mt-2 text-sm text-gray-600">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[52.8rem] print:max-w-none">
        <div className="mb-4 flex justify-end print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Print / Save as PDF
          </button>
        </div>

        <InvoicePrintPreview
          invoice={inv}
          motorLabel={inv.motorLabel}
          fromShopName={inv.fromShopName}
          fromShopContact={inv.fromShopContact}
          fromShopLogoUrl={inv.fromShopLogoUrl}
          fromBillingAddress={inv.fromBillingAddress}
          fromShippingAddress={inv.fromShippingAddress}
          fromPaymentTermsLabel={inv.fromPaymentTermsLabel}
          customerToName={inv.customerToName}
          customerBillingAddress={inv.customerBillingAddress}
          invoicePaymentOptions={inv.invoicePaymentOptions}
          invoiceThankYouNote={inv.invoiceThankYouNote}
          fmt={fmt}
        />
      </div>
    </div>
  );
}
