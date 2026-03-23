"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { useAuth } from "@/contexts/auth-context";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import CompanyAccountsPrint from "@/components/dashboard/company-accounts-print";

export default function QuotePrintPage() {
  const fmt = useFormatMoney();
  const { user } = useAuth();
  const { settings: accountSettings } = useUserSettings();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [quote, setQuote] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [motorLabel, setMotorLabel] = useState("");
  const [preparedByName, setPreparedByName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Quote ID required");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/quotes/${id}`, { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Quote not found");
          return;
        }
        setQuote(data);
        if (data.customerId) {
          const custRes = await fetch(`/api/dashboard/customers/${data.customerId}`, { credentials: "include" });
          if (custRes.ok) {
            const cust = await custRes.json();
            if (!cancelled) setCustomerName(cust.companyName || cust.primaryContactName || "");
          }
        }
        if (data.motorId) {
          const motorRes = await fetch(`/api/dashboard/motors`, { credentials: "include" });
          if (motorRes.ok) {
            const motors = await motorRes.json();
            const m = (Array.isArray(motors) ? motors : []).find((x) => x.id === data.motorId);
            if (m && !cancelled) setMotorLabel([m.serialNumber, m.manufacturer, m.model].filter(Boolean).join(" · ") || m.id);
          }
        }
        if (data.preparedBy != null && String(data.preparedBy).trim() !== "") {
          const empRes = await fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" });
          if (empRes.ok) {
            const emps = await empRes.json();
            const list = Array.isArray(emps) ? emps : [];
            const match = list.find((e) => String(e.id) === String(data.preparedBy));
            if (!cancelled) setPreparedByName(match?.name || "");
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load quote");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!quote || loading) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [quote, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-secondary">Loading quote…</p>
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-red-600">{error || "Quote not found"}</p>
      </div>
    );
  }

  const totalNum = parseFloat(quote.laborTotal || 0) + parseFloat(quote.partsTotal || 0);

  return (
    <div className="max-w-3xl mx-auto p-6 print:p-4 text-sm text-title">
      <div className="mb-6 border-b border-border pb-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Motor Shop</h2>
        <p className="font-semibold text-title">{user?.shopName || "—"}</p>
        <p className="text-sm text-secondary">{[user?.contactName, user?.email].filter(Boolean).join(" · ") || "—"}</p>
      </div>
      <div className="mb-6 border-b border-border pb-4">
        <CompanyAccountsPrint
          billingAddress={accountSettings?.accountsBillingAddress}
          paymentTermsLabel={accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms)}
        />
      </div>
      <div className="border-b border-border pb-4 mb-4">
        <h1 className="text-2xl font-bold">Quote {quote.rfqNumber || ""}</h1>
      </div>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Quote info</h2>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-secondary">RFQ#</dt><dd className="font-medium">{quote.rfqNumber || "—"}</dd></div>
          <div><dt className="text-secondary">Customer PO#</dt><dd>{quote.customerPo || "—"}</dd></div>
          <div><dt className="text-secondary">Date</dt><dd>{quote.date || "—"}</dd></div>
          <div><dt className="text-secondary">Prepared by</dt><dd>{preparedByName || quote.preparedBy || "—"}</dd></div>
        </dl>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Customer & motor</h2>
        <p className="font-medium">{customerName || quote.customerId || "—"}</p>
        <p className="text-secondary">{motorLabel || quote.motorId || "—"}</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Totals</h2>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-secondary">Scope total</dt><dd>{quote.laborTotal ? fmt(quote.laborTotal) : "—"}</dd></div>
          <div><dt className="text-secondary">Parts total</dt><dd>{quote.partsTotal ? fmt(quote.partsTotal) : "—"}</dd></div>
          <div><dt className="text-secondary">Service proposal total</dt><dd className="font-semibold">{fmt(totalNum)}</dd></div>
          <div><dt className="text-secondary">Est. completion</dt><dd>{quote.estimatedCompletion || "—"}</dd></div>
        </dl>
      </section>

      {Array.isArray(quote.scopeLines) && quote.scopeLines.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Scope</h2>
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-card"><tr><th className="px-3 py-2 text-left font-medium">Scope</th><th className="px-3 py-2 text-right font-medium">Price</th></tr></thead>
            <tbody>
              {quote.scopeLines.map((row, i) => (
                <tr key={i} className="border-t border-border"><td className="px-3 py-2">{row.scope || "—"}</td><td className="px-3 py-2 text-right">{row.price ? fmt(row.price) : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {Array.isArray(quote.partsLines) && quote.partsLines.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Other Cost</h2>
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-card"><tr><th className="px-3 py-2 text-left font-medium">Item</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-left font-medium">UOM</th><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Total</th></tr></thead>
            <tbody>
              {quote.partsLines.map((row, i) => {
                const qty = parseFloat(row?.qty ?? "1");
                const price = parseFloat(row?.price ?? "0");
                const lineTotal = Number.isFinite(qty) && Number.isFinite(price) ? (qty * price).toFixed(2) : "—";
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{row.item || "—"}</td>
                    <td className="px-3 py-2 text-right">{row.qty ?? "1"}</td>
                    <td className="px-3 py-2">{row.uom || "—"}</td>
                    <td className="px-3 py-2 text-right">{row.price ? fmt(row.price) : "—"}</td>
                    <td className="px-3 py-2 text-right">{lineTotal !== "—" ? fmt(parseFloat(lineTotal)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {quote.customerNotes && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Customer notes</h2>
          <p className="whitespace-pre-wrap">{quote.customerNotes}</p>
        </section>
      )}
    </div>
  );
}
