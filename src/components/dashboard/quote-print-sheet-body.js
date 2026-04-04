"use client";

import CompanyAccountsPrint from "@/components/dashboard/company-accounts-print";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";

/**
 * Printable quote sheet markup (screen + print). Used by QuotePrintPreview and the standalone print route.
 */
export default function QuotePrintSheetBody({
  quote,
  customerName,
  motorLabel,
  preparedByName,
  fmt,
  accountSettings,
}) {
  if (!quote) return null;

  const totalNum = parseFloat(quote.laborTotal || 0) + parseFloat(quote.partsTotal || 0);

  return (
    <div className="quote-print-sheet max-w-3xl mx-auto p-6 print:p-4 text-sm text-title">
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
          <div>
            <dt className="text-secondary">RFQ#</dt>
            <dd className="font-medium">{quote.rfqNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Customer PO#</dt>
            <dd>{quote.customerPo || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Date</dt>
            <dd>{quote.date || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Prepared by</dt>
            <dd>{preparedByName || quote.preparedBy || "—"}</dd>
          </div>
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
          <div>
            <dt className="text-secondary">Scope total</dt>
            <dd>{quote.laborTotal ? fmt(quote.laborTotal) : "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Parts total</dt>
            <dd>{quote.partsTotal ? fmt(quote.partsTotal) : "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Service proposal total</dt>
            <dd className="font-semibold">{fmt(totalNum)}</dd>
          </div>
          <div>
            <dt className="text-secondary">Est. completion</dt>
            <dd>{quote.estimatedCompletion || "—"}</dd>
          </div>
        </dl>
      </section>

      {Array.isArray(quote.scopeLines) && quote.scopeLines.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Scope</h2>
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-card">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Scope</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {quote.scopeLines.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2">{row.scope || "—"}</td>
                  <td className="px-3 py-2 text-right">{row.price ? fmt(row.price) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {Array.isArray(quote.partsLines) && quote.partsLines.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Other Cost</h2>
          <table className="w-full border border-border rounded-lg overflow-hidden">
            <thead className="bg-card">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-left font-medium">UOM</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
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
                    <td className="px-3 py-2 text-right">
                      {lineTotal !== "—" ? fmt(parseFloat(lineTotal)) : "—"}
                    </td>
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
