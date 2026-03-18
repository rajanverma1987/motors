"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import CompanyAccountsPrint from "@/components/dashboard/company-accounts-print";

export default function QuoteRespondPage() {
  const params = useParams();
  const token = params?.token;
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invalid link");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quotes/respond?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Quote not found");
          return;
        }
        setQuote(data);
      } catch {
        if (!cancelled) setError("Failed to load quote");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleRespond = async (action) => {
    if (!token || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond");
      setResponse(data);
    } catch (err) {
      setResponse({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-600">Loading quote…</p>
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || "Quote not found"}</p>
          <p className="mt-2 text-sm text-gray-600">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (response?.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 print:hidden">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Thank you</h1>
          <p className="text-gray-700">{response.message}</p>
        </div>
      </div>
    );
  }
  if (response?.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 print:hidden">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">{response.error}</p>
        </div>
      </div>
    );
  }

  const total = (parseFloat(quote.laborTotal || 0) + parseFloat(quote.partsTotal || 0)).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:py-4 print:px-0">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow print:shadow-none print:max-w-none">
        <div className="p-6 print:p-4 space-y-6">
          {(quote.status === "approved" || quote.status === "rejected") && (
            <div
              className={`rounded-lg border px-4 py-3 text-center text-sm font-medium print:mb-4 ${
                quote.status === "approved"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
              role="status"
            >
              {quote.status === "approved"
                ? "Quote was approved by customer"
                : "Quote was rejected by customer"}
              {quote.respondedAt && (
                <span className="block mt-1 text-xs opacity-90">
                  {new Date(quote.respondedAt).toLocaleDateString(undefined, {
                    dateStyle: "long",
                  })}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 print:border-gray-300 print:hidden">
            <h1 className="text-2xl font-bold text-gray-900">Service Proposal</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Print / Save as PDF
              </button>
              <button
                type="button"
                onClick={() => handleRespond("approve")}
                disabled={submitting || quote.status === "approved" || quote.status === "rejected"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending…" : "Approve quote"}
              </button>
              <button
                type="button"
                onClick={() => handleRespond("reject")}
                disabled={submitting || quote.status === "approved" || quote.status === "rejected"}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-300 bg-white text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Sending…" : "Reject quote"}
              </button>
            </div>
          </div>

          {/* Same layout as print: Motor Shop, Service Proposal title, Quote info, Customer & motor, Scope, Other Cost, Totals, Customer notes */}
          <section className="mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Motor Shop</h2>
            <p className="font-semibold text-gray-900">{quote.shop?.name || "—"}</p>
            <p className="text-sm text-gray-500">{quote.shop?.contact || "—"}</p>
          </section>
          <div className="mb-6 border-b border-gray-200 pb-4">
            <CompanyAccountsPrint
              billingAddress={quote.accountsBillingAddress}
              paymentTermsLabel={quote.accountsPaymentTermsLabel}
              bodyClassName="text-sm text-gray-900 whitespace-pre-wrap"
              termsLabelClassName="text-gray-500"
              termsValueClassName="font-medium text-gray-900"
            />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 print:block hidden">Service Proposal</h1>
          </div>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Quote info</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-gray-500">RFQ#</dt><dd className="font-medium text-gray-900">{quote.rfqNumber || "—"}</dd></div>
              <div><dt className="text-gray-500">Customer PO#</dt><dd className="text-gray-900">{quote.customerPo || "—"}</dd></div>
              <div><dt className="text-gray-500">Date</dt><dd className="text-gray-900">{quote.date || "—"}</dd></div>
              <div><dt className="text-gray-500">Prepared by</dt><dd className="text-gray-900">{quote.preparedBy || "—"}</dd></div>
            </dl>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Customer & motor</h2>
            <p className="font-medium text-gray-900">{quote.customerName || quote.customerId || "—"}</p>
            <p className="text-gray-500">{quote.motorLabel || quote.motorId || "—"}</p>
          </section>

          {Array.isArray(quote.scopeLines) && quote.scopeLines.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Scope</h2>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left font-medium text-gray-700">Scope</th><th className="px-3 py-2 text-right font-medium text-gray-700">Price</th></tr></thead>
                <tbody>
                  {quote.scopeLines.map((row, i) => (
                    <tr key={i} className="border-t border-gray-200"><td className="px-3 py-2 text-gray-900">{row.scope || "—"}</td><td className="px-3 py-2 text-right text-gray-900">{row.price ? `$${row.price}` : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {Array.isArray(quote.partsLines) && quote.partsLines.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Other Cost</h2>
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left font-medium text-gray-700">Item</th><th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th><th className="px-3 py-2 text-left font-medium text-gray-700">UOM</th><th className="px-3 py-2 text-right font-medium text-gray-700">Price</th><th className="px-3 py-2 text-right font-medium text-gray-700">Total</th></tr></thead>
                <tbody>
                  {quote.partsLines.map((row, i) => {
                    const qty = parseFloat(row?.qty ?? "1");
                    const price = parseFloat(row?.price ?? "0");
                    const lineTotal = Number.isFinite(qty) && Number.isFinite(price) ? (qty * price).toFixed(2) : "—";
                    return (
                      <tr key={i} className="border-t border-gray-200">
                        <td className="px-3 py-2 text-gray-900">{row.item || "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{row.qty ?? "1"}</td>
                        <td className="px-3 py-2 text-gray-900">{row.uom || "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{row.price ? `$${row.price}` : "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{lineTotal !== "—" ? `$${lineTotal}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Totals</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-gray-500">Scope total</dt><dd className="text-gray-900">{quote.laborTotal ? `$${quote.laborTotal}` : "—"}</dd></div>
              <div><dt className="text-gray-500">Other Cost total</dt><dd className="text-gray-900">{quote.partsTotal ? `$${quote.partsTotal}` : "—"}</dd></div>
              <div><dt className="text-gray-500">Service proposal total</dt><dd className="font-semibold text-gray-900">${total}</dd></div>
              <div><dt className="text-gray-500">Est. completion</dt><dd className="text-gray-900">{quote.estimatedCompletion || "—"}</dd></div>
            </dl>
          </section>

          {quote.customerNotes && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Customer notes</h2>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{quote.customerNotes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
