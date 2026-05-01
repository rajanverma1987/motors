"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { InvoicePaymentFooterPrint } from "@/components/dashboard/invoice-payment-footer";
import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { formatMoney } from "@/lib/format-currency";
import { computeTotalsFromLaborAndParts } from "@/lib/quote-invoice-totals";

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

  const code = inv.currency || "USD";
  const fmt = (v) => formatMoney(v, code);
  const totals = computeTotalsFromLaborAndParts({
    laborTotal: inv.laborTotal,
    partsTotal: inv.partsTotal,
    taxExempt: inv.customerTaxExempt,
    taxPercent: inv.customerTaxPercent,
  });

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:px-3 print:py-3">
      <div className="mx-auto max-w-[52.8rem] rounded-lg bg-white p-4 text-sm leading-snug shadow print:max-w-none print:rounded-none print:p-3 print:shadow-none">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-2">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <PrintShopLogo logoUrl={inv.fromShopLogoUrl} alt="" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">From</p>
              <p className="font-semibold text-gray-900">{inv.fromShopName || "—"}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 print:text-black">Invoice</h1>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 print:hidden"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
        <div className="mb-3 grid gap-3 border-b border-gray-200 pb-3 sm:grid-cols-2 print:grid-cols-2">
          <div className="min-w-0">
            {inv.fromShopContact ? (
              <p className="text-xs text-gray-600">{inv.fromShopContact}</p>
            ) : null}
            {inv.fromBillingAddress ? (
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-900">{inv.fromBillingAddress}</p>
            ) : null}
            <p className="mt-1.5 text-xs">
              <span className="text-gray-500">Payment terms: </span>
              <span className="font-medium text-gray-900">{inv.fromPaymentTermsLabel || "—"}</span>
            </p>
          </div>
          <div className="min-w-0 sm:text-right print:text-right">
            <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-right">
              To
            </h2>
            {inv.customerToName ? (
              <p className="whitespace-pre-wrap font-medium text-gray-900 sm:ml-auto sm:text-right">
                {inv.customerToName}
              </p>
            ) : (
              <p className="text-gray-500">—</p>
            )}
            {inv.customerBillingAddress ? (
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-900 sm:ml-auto sm:text-right">
                {inv.customerBillingAddress}
              </p>
            ) : null}
          </div>
        </div>

        <section className="mb-3">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Invoice info</h2>
          <dl className="grid gap-x-3 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-gray-500">Invoice#</dt>
              <dd className="font-medium text-gray-900">{inv.invoiceNumber || inv.rfqNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Customer PO#</dt>
              <dd className="text-gray-900">{inv.customerPo || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Date</dt>
              <dd className="text-gray-900">{inv.date || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Prepared by</dt>
              <dd className="text-gray-900">{inv.preparedBy || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="mb-3">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Motor</h2>
          <p className="text-xs font-medium text-gray-900">{inv.motorLabel || "—"}</p>
        </section>

        {Array.isArray(inv.scopeLines) && inv.scopeLines.length > 0 && (
          <section className="mb-3">
            <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Scope</h2>
            <table className="w-full overflow-hidden rounded border border-gray-300 text-xs">
              <thead className="bg-gray-900 text-left text-[10px] font-semibold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-2 py-1.5">Scope</th>
                  <th className="w-[7rem] px-2 py-1.5 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {inv.scopeLines.map((row, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-2 py-1.5 align-top text-gray-900">{row.scope || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-900">
                      {row.price ? fmt(row.price) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {Array.isArray(inv.partsLines) && inv.partsLines.length > 0 && (
          <section className="mb-3">
            <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Other cost</h2>
            <table className="w-full overflow-hidden rounded border border-gray-300 text-xs">
              <thead className="bg-gray-900 text-left text-[10px] font-semibold uppercase tracking-wide text-white">
                <tr>
                  <th className="px-2 py-1.5">Item</th>
                  <th className="w-10 px-2 py-1.5 text-right">Qty</th>
                  <th className="w-12 px-2 py-1.5">UOM</th>
                  <th className="w-[4.5rem] px-2 py-1.5 text-right">Price</th>
                  <th className="w-[5rem] px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.partsLines.map((row, i) => {
                  const qty = parseFloat(row?.qty ?? "1");
                  const price = parseFloat(row?.price ?? "0");
                  const lineTotal =
                    Number.isFinite(qty) && Number.isFinite(price) ? qty * price : null;
                  return (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="px-2 py-1.5 text-gray-900">{row.item || "—"}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-900">{row.qty ?? "1"}</td>
                      <td className="px-2 py-1.5 text-gray-900">{row.uom || "—"}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-900">
                        {row.price ? fmt(row.price) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-gray-900">
                        {lineTotal != null ? fmt(lineTotal) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <section className="mb-3">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Totals</h2>
          <table className="w-full border border-gray-300 text-xs tabular-nums">
            <tbody>
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="px-2 py-1.5 font-medium text-gray-800">Scope total</td>
                <td className="px-2 py-1.5 text-right font-medium text-gray-900">
                  {inv.laborTotal ? fmt(inv.laborTotal) : "—"}
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-1.5 text-gray-800">Other cost total</td>
                <td className="px-2 py-1.5 text-right text-gray-900">{inv.partsTotal ? fmt(inv.partsTotal) : "—"}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-1.5 text-gray-800">Invoice subtotal</td>
                <td className="px-2 py-1.5 text-right text-gray-900">{fmt(totals.subtotal)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-2 py-1.5 text-gray-800">Tax</td>
                <td className="px-2 py-1.5 text-right text-gray-900">{fmt(totals.taxAmount)}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="px-2 py-2 text-sm font-bold text-gray-900">Grand total</td>
                <td className="px-2 py-2 text-right text-sm font-bold text-gray-900">{fmt(totals.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {inv.customerNotes && (
          <section className="mb-3">
            <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Customer notes</h2>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-900">{inv.customerNotes}</p>
          </section>
        )}
        <InvoicePaymentFooterPrint
          paymentOptions={inv.invoicePaymentOptions}
          thankYouNote={inv.invoiceThankYouNote}
          variant="customer"
          compact
        />
      </div>
    </div>
  );
}
