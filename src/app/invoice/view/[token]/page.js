"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { InvoicePaymentFooterPrint } from "@/components/dashboard/invoice-payment-footer";
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
  const totalNum = parseFloat(inv.laborTotal || 0) + parseFloat(inv.partsTotal || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:px-0 print:py-4">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow print:max-w-none print:rounded-none print:p-4 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 print:text-black">Invoice</h1>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 print:hidden"
          >
            Print / Save as PDF
          </button>
        </div>
        <div className="mb-6 grid gap-8 border-b border-gray-200 pb-6 sm:grid-cols-2 print:grid-cols-2">
          <div className="min-w-0">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">From</h2>
            <p className="font-semibold text-gray-900">{inv.fromShopName || "—"}</p>
            {inv.fromShopContact ? (
              <p className="mt-1 text-sm text-gray-600">{inv.fromShopContact}</p>
            ) : null}
            {inv.fromBillingAddress ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-900">{inv.fromBillingAddress}</p>
            ) : null}
            <p className="mt-3 text-sm">
              <span className="text-gray-500">Payment terms: </span>
              <span className="font-medium text-gray-900">{inv.fromPaymentTermsLabel || "—"}</span>
            </p>
          </div>
          <div className="min-w-0 sm:text-right print:text-right">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:text-right">
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
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-900 sm:ml-auto sm:text-right">
                {inv.customerBillingAddress}
              </p>
            ) : null}
          </div>
        </div>

        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice info</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
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

        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Motor</h2>
          <p className="text-gray-900">{inv.motorLabel || "—"}</p>
        </section>

        {Array.isArray(inv.scopeLines) && inv.scopeLines.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Scope</h2>
            <table className="w-full overflow-hidden rounded-lg border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Scope</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Price</th>
                </tr>
              </thead>
              <tbody>
                {inv.scopeLines.map((row, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-3 py-2 text-gray-900">{row.scope || "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {row.price ? fmt(row.price) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {Array.isArray(inv.partsLines) && inv.partsLines.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Other Cost</h2>
            <table className="w-full overflow-hidden rounded-lg border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Item</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">UOM</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Price</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
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
                      <td className="px-3 py-2 text-gray-900">{row.item || "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-900">{row.qty ?? "1"}</td>
                      <td className="px-3 py-2 text-gray-900">{row.uom || "—"}</td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {row.price ? fmt(row.price) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900">
                        {lineTotal != null ? fmt(lineTotal) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Totals</h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-gray-500">Scope total</dt>
              <dd className="text-gray-900">{inv.laborTotal ? fmt(inv.laborTotal) : "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Other Cost total</dt>
              <dd className="text-gray-900">{inv.partsTotal ? fmt(inv.partsTotal) : "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Invoice total</dt>
              <dd className="font-semibold text-gray-900">{fmt(totalNum)}</dd>
            </div>
          </dl>
        </section>

        {inv.customerNotes && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Customer notes</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-900">{inv.customerNotes}</p>
          </section>
        )}
        <InvoicePaymentFooterPrint
          paymentOptions={inv.invoicePaymentOptions}
          thankYouNote={inv.invoiceThankYouNote}
          variant="customer"
        />
      </div>
    </div>
  );
}
