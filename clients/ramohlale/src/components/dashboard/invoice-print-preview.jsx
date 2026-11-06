"use client";

import { useFormatDate, useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { formatMoney } from "@/lib/format-currency";
import { InvoicePaymentFooterPrint } from "@/components/dashboard/invoice-payment-footer";
import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import PrintSheetContinuedNotes from "@/components/dashboard/print-sheet-continued-notes";
import MotorSummaryBlock from "@/components/dashboard/motor-summary-block";
import { computeTotalsFromLaborAndParts, formatTaxLineLabel } from "@/lib/quote-invoice-totals";
import { SERVICE_PROPOSAL_DOCUMENT_TITLE } from "@/lib/quote-document-labels";
import { printPartsLineQty, printPartsLineTotal } from "@/lib/simple-service-proposal-print";

const sectionLabel = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600";
const infoFieldLabel = "font-semibold text-neutral-900";
const addressTitleLabel = "mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-900";
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
  logoDocumentScale,
  fromBillingAddress = "",
  fromShippingAddress = "",
  fromPaymentTermsLabel = "",
  customerToName = "",
  customerBillingAddress = "",
  invoicePaymentOptions = "",
  invoiceThankYouNote = "",
  fmt: fmtProp,
  currency,
}) {
  const contextFmt = useFormatMoney();
  const formatDate = useFormatDate();
  const fmt =
    typeof fmtProp === "function"
      ? fmtProp
      : currency
        ? (v) => formatMoney(v, currency)
        : contextFmt;
  const { settings } = useUserSettings();
  if (!q) return null;

  const billingAddress = String(fromBillingAddress || settings?.accountsBillingAddress || "").trim();
  const shippingAddress = String(fromShippingAddress || settings?.accountsShippingAddress || "").trim();
  const notesMode = q.printNotesMode === "internal" ? "internal" : "customer";
  const notesText =
    notesMode === "internal" ? String(q.notes || "").trim() : String(q.customerNotes || "").trim();
  const toName = String(customerToName || q.customerToName || "").trim();
  const toAddress = String(customerBillingAddress || q.customerBillingAddress || "").trim();

  const totals = computeTotalsFromLaborAndParts({
    laborTotal: q.laborTotal,
    partsTotal: q.partsTotal,
    taxablePartsTotal: q.taxablePartsTotal,
    taxExempt: q.customerTaxExempt,
    taxPercent: q.customerTaxPercent,
    discount: q.discount,
  });

  return (
    <div className="mx-auto max-w-[52.8rem] bg-white text-sm leading-snug text-neutral-900 print:max-w-none print:text-black">
      <header className="mb-2 border-b border-neutral-300 pb-1.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="min-w-0 justify-self-start">
            <PrintShopLogo logoUrl={fromShopLogoUrl} scale={logoDocumentScale} alt="" />
          </div>
          <h1 className="px-2 text-center text-3xl font-bold tracking-tight text-neutral-900 print:text-[22pt]">
            Tax Invoice
          </h1>
          <div className="min-w-0 shrink-0 justify-self-end text-right">
            <p className="mt-0.5 text-xl font-bold leading-tight tracking-tight text-neutral-900 print:text-[16pt]">
              {q.invoiceNumber || "—"}
            </p>
            <p className="mt-1.5 text-xs text-neutral-800">
              <span className="font-semibold">Customer PO: </span>
              {q.customerPo || "—"}
            </p>
            <p className="text-xs text-neutral-800">
              <span className="font-semibold">Invoice Sent Date: </span>
              {formatDate(q.invoiceSubmitDate)}
            </p>
          </div>
        </div>
        <div className="mt-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600">From</p>
          <p className="text-sm font-semibold text-neutral-900">{fromShopName || "—"}</p>
          {fromShopContact ? <p className="text-xs text-neutral-700">{fromShopContact}</p> : null}
        </div>
      </header>

      <div className="mb-2 grid gap-2 border-b border-neutral-200 pb-2 sm:grid-cols-2 print:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs text-neutral-800">
            <span className="text-neutral-600">Payment terms: </span>
            <span className="font-medium">{fromPaymentTermsLabel || "—"}</span>
          </p>
          <div className="mt-1">
            <p className={addressTitleLabel}>Billing address</p>
            <p className="whitespace-pre-wrap text-xs text-neutral-800">{billingAddress || "—"}</p>
          </div>
          {shippingAddress && shippingAddress !== billingAddress ? (
            <div className="mt-1">
              <p className={addressTitleLabel}>Shipping address</p>
              <p className="whitespace-pre-wrap text-xs text-neutral-800">{shippingAddress}</p>
            </div>
          ) : null}
        </div>
        <div className="min-w-0 justify-self-end text-right">
          <p className={sectionLabel + " text-right"}>To</p>
          {toName ? (
            <p className="whitespace-pre-wrap text-right text-xs font-medium text-neutral-900">
              {toName}
            </p>
          ) : (
            <p className="text-right text-xs text-neutral-500">—</p>
          )}
          {toAddress ? (
            <p className="mt-1.5 whitespace-pre-wrap text-right text-xs text-neutral-800">
              {toAddress}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mb-2">
        <h2 className={sectionLabel}>Quotation Info</h2>
        <dl className="grid grid-cols-4 gap-x-3 gap-y-1 text-xs">
          <div>
            <dt className={infoFieldLabel}>{SERVICE_PROPOSAL_DOCUMENT_TITLE}#</dt>
            <dd className="text-neutral-900">{q.rfqNumber || "—"}</dd>
          </div>
          <div>
            <dt className={infoFieldLabel}>Quotation Sent Date</dt>
            <dd className="text-neutral-900">{formatDate(q.proposalSubmitDate || q.date)}</dd>
          </div>
          <div>
            <dt className={infoFieldLabel}>Prepared by</dt>
            <dd className="text-neutral-900">{q.preparedByDisplay || q.preparedBy || "—"}</dd>
          </div>
          <div>
            <dt className={infoFieldLabel}>Quotation Approved By</dt>
            <dd className="text-neutral-900">
              {q.proposalApprovedByDisplay || q.proposalApprovedBy || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-2 rounded border border-neutral-200 bg-neutral-50/80 p-2">
        <MotorSummaryBlock
          identityLine={q.motorIdentityLine}
          specsLine={q.motorSpecsLine}
          detailsLine={q.motorDetailsLine}
          motorType={q.motorType}
          fallback={motorLabel || q.motorLabel || q.motorId || "—"}
          titleClassName="mb-1 text-sm font-semibold text-neutral-900"
        />
      </section>

      {Array.isArray(q.scopeLines) && q.scopeLines.length > 0 && (
        <section className="mb-2">
          <h2 className={sectionLabel}>Scope</h2>
          <table className={tableWrap + " w-full"}>
            <thead className={thRow}>
              <tr>
                <th className={thCell + " text-left"}>Scope</th>
                <th className={thCell + " w-12 text-right"}>Qty</th>
                <th className={thCell + " w-[5.5rem] text-right"}>Rate</th>
                <th className={thCell + " w-[7rem] text-right"}>Price</th>
              </tr>
            </thead>
            <tbody>
              {q.scopeLines.map((row, i) => (
                <tr key={i}>
                  <td className={tdCell + " align-top"}>{row.scope || "—"}</td>
                  <td className={tdCell + " text-right tabular-nums"}>{row.qty || "-"}</td>
                  <td className={tdCell + " text-right tabular-nums"}>{row.rate ? fmt(row.rate) : "-"}</td>
                  <td className={tdCell + " text-right tabular-nums"}>{row.price ? fmt(row.price) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {Array.isArray(q.partsLines) && q.partsLines.length > 0 && (
        <section className="mb-2">
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
                const lineTotalNum = printPartsLineTotal(row);
                const qtyDisplay = printPartsLineQty(row);
                return (
                  <tr key={i}>
                    <td className={tdCell}>{row.item || "—"}</td>
                    <td className={tdCell + " text-right tabular-nums"}>{qtyDisplay || "—"}</td>
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

      <section className="print-totals-block mb-2 break-inside-avoid">
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
              <td className="px-2 py-1.5 text-neutral-800">Subtotal</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{fmt(totals.subtotal)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">Discount</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{fmt(totals.discountAmount)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">Total</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{fmt(totals.total)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">
                {formatTaxLineLabel(q.customerTaxPercent, q.customerTaxExempt)}
              </td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{fmt(totals.taxAmount)}</td>
            </tr>
            <tr className="bg-neutral-100">
              <td className="px-2 py-2 text-sm font-bold text-neutral-900">Invoice total</td>
              <td className="px-2 py-2 text-right text-sm font-bold text-neutral-900">{fmt(totals.grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {notesText ? (
        <PrintSheetContinuedNotes
          notesHeading={notesMode === "internal" ? "Notes" : "Customer notes"}
          notesText={notesText}
        >
          <InvoicePaymentFooterPrint
            paymentOptions={invoicePaymentOptions}
            thankYouNote={invoiceThankYouNote}
            variant="dashboard"
            compact
          />
        </PrintSheetContinuedNotes>
      ) : (
        <InvoicePaymentFooterPrint
          paymentOptions={invoicePaymentOptions}
          thankYouNote={invoiceThankYouNote}
          variant="dashboard"
          compact
        />
      )}
    </div>
  );
}
