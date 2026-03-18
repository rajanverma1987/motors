"use client";

import { useFormatMoney } from "@/contexts/user-settings-context";
import { InvoicePaymentFooterPrint } from "@/components/dashboard/invoice-payment-footer";

/**
 * Printable invoice body. Wrap in a container with class invoice-print-preview for print CSS.
 */
export default function InvoicePrintPreview({
  invoice: q,
  motorLabel,
  fromShopName = "",
  fromShopContact = "",
  fromBillingAddress = "",
  fromPaymentTermsLabel = "",
  customerToName = "",
  customerBillingAddress = "",
  invoicePaymentOptions = "",
  invoiceThankYouNote = "",
}) {
  const fmt = useFormatMoney();
  if (!q) return null;
  const totalNum = parseFloat(q.laborTotal || 0) + parseFloat(q.partsTotal || 0);
  return (
    <div className="mx-auto max-w-3xl text-title">
      <h1 className="mb-6 border-b border-border pb-4 text-4xl font-bold tracking-tight">Invoice</h1>
      <div className="mb-6 grid gap-8 border-b border-border pb-6 sm:grid-cols-2 print:grid-cols-2">
        <div className="min-w-0">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">From</h2>
          <p className="font-semibold text-title">{fromShopName || "—"}</p>
          {fromShopContact ? (
            <p className="mt-1 text-sm text-secondary">{fromShopContact}</p>
          ) : null}
          {fromBillingAddress ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-title">{fromBillingAddress}</p>
          ) : null}
          <p className="mt-3 text-sm">
            <span className="text-secondary">Payment terms: </span>
            <span className="font-medium text-title">{fromPaymentTermsLabel || "—"}</span>
          </p>
        </div>
        <div className="min-w-0 sm:text-right print:text-right">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary sm:text-right">
            To
          </h2>
          {customerToName ? (
            <p className="whitespace-pre-wrap font-medium text-title sm:ml-auto sm:max-w-full sm:text-right">
              {customerToName}
            </p>
          ) : (
            <p className="text-secondary">—</p>
          )}
          {customerBillingAddress ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-title sm:ml-auto sm:max-w-full sm:text-right">
              {customerBillingAddress}
            </p>
          ) : null}
        </div>
      </div>
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Invoice info</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-secondary">Invoice#</dt>
            <dd className="font-medium">{q.invoiceNumber || q.rfqNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Customer PO#</dt>
            <dd>{q.customerPo || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Date</dt>
            <dd>{q.date || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Prepared by</dt>
            <dd>{q.preparedByDisplay || q.preparedBy || "—"}</dd>
          </div>
        </dl>
      </section>
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Motor</h2>
        <p className="text-title">{motorLabel || q.motorId || "—"}</p>
      </section>
      {Array.isArray(q.scopeLines) && q.scopeLines.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Scope</h2>
          <table className="w-full overflow-hidden rounded-lg border border-border text-sm">
            <thead className="bg-card">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Scope</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {q.scopeLines.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2">{row.scope || "—"}</td>
                  <td className="px-3 py-2 text-right">{row.price ? fmt(row.price) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {Array.isArray(q.partsLines) && q.partsLines.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Other Cost</h2>
          <table className="w-full overflow-hidden rounded-lg border border-border text-sm">
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
              {q.partsLines.map((row, i) => {
                const qty = parseFloat(row?.qty ?? "1");
                const price = parseFloat(row?.price ?? "0");
                const lineTotalNum =
                  Number.isFinite(qty) && Number.isFinite(price) ? qty * price : null;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{row.item || "—"}</td>
                    <td className="px-3 py-2 text-right">{row.qty ?? "1"}</td>
                    <td className="px-3 py-2">{row.uom || "—"}</td>
                    <td className="px-3 py-2 text-right">{row.price ? fmt(row.price) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {lineTotalNum != null ? fmt(lineTotalNum) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Totals</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-secondary">Scope total</dt>
            <dd>{q.laborTotal ? fmt(q.laborTotal) : "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Other Cost total</dt>
            <dd>{q.partsTotal ? fmt(q.partsTotal) : "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Invoice total</dt>
            <dd className="font-semibold">{fmt(totalNum)}</dd>
          </div>
        </dl>
      </section>
      {q.customerNotes && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer notes</h2>
          <p className="whitespace-pre-wrap">{q.customerNotes}</p>
        </section>
      )}
      <InvoicePaymentFooterPrint
        paymentOptions={invoicePaymentOptions}
        thankYouNote={invoiceThankYouNote}
        variant="dashboard"
      />
    </div>
  );
}
