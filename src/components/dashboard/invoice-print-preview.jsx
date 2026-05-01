"use client";

import { useFormatMoney } from "@/contexts/user-settings-context";
import { InvoicePaymentFooterPrint } from "@/components/dashboard/invoice-payment-footer";
import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { computeTotalsFromLaborAndParts } from "@/lib/quote-invoice-totals";

const sectionLabel = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600";
const tableWrap = "overflow-hidden rounded border border-neutral-300 text-xs print:text-[11px]";
const thRow = "bg-neutral-900 text-left text-[10px] font-semibold uppercase tracking-wide text-white";
const thCell = "px-2 py-1.5";
const tdCell = "border-t border-neutral-200 px-2 py-1.5 text-neutral-900";

/**
 * Printable invoice body. Render via `InvoicePrintOffscreen` (off-screen + @media print) per project print rules.
 */
export default function InvoicePrintPreview({
  invoice: q,
  motorLabel,
  fromShopName = "",
  fromShopContact = "",
  fromShopLogoUrl = "",
  fromBillingAddress = "",
  fromPaymentTermsLabel = "",
  customerToName = "",
  customerBillingAddress = "",
  invoicePaymentOptions = "",
  invoiceThankYouNote = "",
}) {
  const fmt = useFormatMoney();
  if (!q) return null;
  const totals = computeTotalsFromLaborAndParts({
    laborTotal: q.laborTotal,
    partsTotal: q.partsTotal,
    taxExempt: q.customerTaxExempt,
    taxPercent: q.customerTaxPercent,
  });

  return (
    <div className="mx-auto max-w-[52.8rem] bg-white text-sm leading-snug text-neutral-900 print:max-w-none print:text-black">
      {/* Masthead: logo + title (print-friendly contrast) */}
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-300 pb-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <PrintShopLogo logoUrl={fromShopLogoUrl} alt="" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600">From</p>
            <p className="font-semibold text-neutral-900">{fromShopName || "—"}</p>
            {fromShopContact ? <p className="text-xs text-neutral-700">{fromShopContact}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 print:text-[22pt]">Invoice</h1>
        </div>
      </header>

      <div className="mb-3 grid gap-3 border-b border-neutral-200 pb-3 sm:grid-cols-2 print:grid-cols-2">
        <div className="min-w-0">
          {fromBillingAddress ? (
            <p className="whitespace-pre-wrap text-xs text-neutral-800">{fromBillingAddress}</p>
          ) : null}
          <p className="mt-1.5 text-xs text-neutral-800">
            <span className="text-neutral-600">Payment terms: </span>
            <span className="font-medium">{fromPaymentTermsLabel || "—"}</span>
          </p>
        </div>
        <div className="min-w-0 sm:text-right print:text-right">
          <p className={sectionLabel + " sm:text-right"}>To</p>
          {customerToName ? (
            <p className="whitespace-pre-wrap text-xs font-medium text-neutral-900 sm:ml-auto sm:text-right">
              {customerToName}
            </p>
          ) : (
            <p className="text-xs text-neutral-500">—</p>
          )}
          {customerBillingAddress ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs text-neutral-800 sm:ml-auto sm:text-right">
              {customerBillingAddress}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mb-3">
        <h2 className={sectionLabel}>Invoice info</h2>
        <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-neutral-600">Invoice#</dt>
            <dd className="font-medium text-neutral-900">{q.invoiceNumber || q.rfqNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Customer PO#</dt>
            <dd className="text-neutral-900">{q.customerPo || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Date</dt>
            <dd className="text-neutral-900">{q.date || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Prepared by</dt>
            <dd className="text-neutral-900">{q.preparedByDisplay || q.preparedBy || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-3">
        <h2 className={sectionLabel}>Motor</h2>
        <p className="text-xs font-medium text-neutral-900">{motorLabel || q.motorId || "—"}</p>
      </section>

      {Array.isArray(q.scopeLines) && q.scopeLines.length > 0 && (
        <section className="mb-3">
          <h2 className={sectionLabel}>Scope</h2>
          <table className={tableWrap + " w-full"}>
            <thead className={thRow}>
              <tr>
                <th className={thCell + " text-left"}>Scope</th>
                <th className={thCell + " w-[7rem] text-right"}>Price</th>
              </tr>
            </thead>
            <tbody>
              {q.scopeLines.map((row, i) => (
                <tr key={i}>
                  <td className={tdCell + " align-top"}>{row.scope || "—"}</td>
                  <td className={tdCell + " text-right tabular-nums"}>{row.price ? fmt(row.price) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {Array.isArray(q.partsLines) && q.partsLines.length > 0 && (
        <section className="mb-3">
          <h2 className={sectionLabel}>Other cost</h2>
          <table className={tableWrap + " w-full"}>
            <thead className={thRow}>
              <tr>
                <th className={thCell}>Item</th>
                <th className={thCell + " w-10 text-right"}>Qty</th>
                <th className={thCell + " w-12"}>UOM</th>
                <th className={thCell + " w-[4.5rem] text-right"}>Price</th>
                <th className={thCell + " w-[5rem] text-right"}>Total</th>
              </tr>
            </thead>
            <tbody>
              {q.partsLines.map((row, i) => {
                const qty = parseFloat(row?.qty ?? "1");
                const price = parseFloat(row?.price ?? "0");
                const lineTotalNum =
                  Number.isFinite(qty) && Number.isFinite(price) ? qty * price : null;
                return (
                  <tr key={i}>
                    <td className={tdCell}>{row.item || "—"}</td>
                    <td className={tdCell + " text-right tabular-nums"}>{row.qty ?? "1"}</td>
                    <td className={tdCell}>{row.uom || "—"}</td>
                    <td className={tdCell + " text-right tabular-nums"}>{row.price ? fmt(row.price) : "—"}</td>
                    <td className={tdCell + " text-right tabular-nums"}>
                      {lineTotalNum != null ? fmt(lineTotalNum) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="mb-3">
        <h2 className={sectionLabel}>Totals</h2>
        <table className="w-full border border-neutral-300 text-xs tabular-nums print:text-[11px]">
          <tbody>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <td className="px-2 py-1.5 font-medium text-neutral-800">Scope total</td>
              <td className="px-2 py-1.5 text-right font-medium text-neutral-900">
                {q.laborTotal ? fmt(q.laborTotal) : "—"}
              </td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">Other cost total</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{q.partsTotal ? fmt(q.partsTotal) : "—"}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">Invoice subtotal</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{fmt(totals.subtotal)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">Tax</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{fmt(totals.taxAmount)}</td>
            </tr>
            <tr className="bg-neutral-100">
              <td className="px-2 py-2 text-sm font-bold text-neutral-900">Grand total</td>
              <td className="px-2 py-2 text-right text-sm font-bold text-neutral-900">{fmt(totals.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {q.customerNotes ? (
        <section className="mb-3">
          <h2 className={sectionLabel}>Customer notes</h2>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-800">{q.customerNotes}</p>
        </section>
      ) : null}

      <InvoicePaymentFooterPrint
        paymentOptions={invoicePaymentOptions}
        thankYouNote={invoiceThankYouNote}
        variant="dashboard"
        compact
      />
    </div>
  );
}
