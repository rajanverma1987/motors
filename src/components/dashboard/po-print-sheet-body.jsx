"use client";

import { InvoicePaymentFooterPrint } from "@/components/dashboard/invoice-payment-footer";
import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { poBalanceDueVendorFacing } from "@/lib/po-payable";
import { parsePoLineTaxPercent, poLineTaxAmount, poLineTotalWithTax } from "@/lib/po-line-item-totals";

const sectionLabel = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600";
const tableWrap = "overflow-hidden rounded border border-neutral-300 text-xs print:text-[11px]";
const thRow = "bg-neutral-900 text-left text-[10px] font-semibold uppercase tracking-wide text-white";
const thCell = "px-2 py-1.5";
const tdCell = "border-t border-neutral-200 px-2 py-1.5 text-neutral-900";

/**
 * Printable purchase order (dashboard). Used by PoPrintPreview.
 * Layout matches {@link InvoicePrintPreview} for consistent print quality.
 */
export default function PoPrintSheetBody({ po, vendor, settings, fmt }) {
  if (!po) return null;

  const formatMoney = typeof fmt === "function" ? fmt : (v) => (v != null && v !== "" ? String(v) : "—");

  const v = vendor || {};
  const addrLine = [v.address, [v.city, v.state, v.zipCode].filter(Boolean).join(", ")].filter(Boolean).join(" — ");
  const contactLine = [v.phone, v.email].filter(Boolean).join(" | ");

  const logoUrl = String(po.fromShopLogoUrl || settings?.logoUrl || "").trim();
  const fromShopName = String(po.fromShopName || "").trim();
  const fromShopContact = String(po.fromShopContact || "").trim();
  const billing = String(po.fromAccountsBillingAddress || settings?.accountsBillingAddress || "").trim();
  const shipping = String(po.fromAccountsShippingAddress || settings?.accountsShippingAddress || "").trim();
  const paymentTerms = String(po.fromPaymentTermsLabel || "").trim();
  const showShipTo = shipping && shipping !== billing;

  const vendorToLines = [v.name || po.vendorName || "", v.contactName || "", addrLine, contactLine]
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  const balanceDueDisplay = poBalanceDueVendorFacing(po);
  const invoicedNum = parseFloat(po.totalInvoiced) || 0;
  const balanceDueLabel =
    invoicedNum > 0 ? "Balance due (on invoices)" : "Balance due";

  return (
    <div className="mx-auto max-w-[52.8rem] bg-white text-sm leading-snug text-neutral-900 print:max-w-none print:text-black">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-300 pb-2">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <PrintShopLogo logoUrl={logoUrl} alt="" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600">From</p>
            <p className="font-semibold text-neutral-900">{fromShopName || "—"}</p>
            {fromShopContact ? <p className="text-xs text-neutral-700">{fromShopContact}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 print:text-[22pt]">Purchase order</h1>
          {po.poNumber ? <p className="mt-0.5 text-xs text-neutral-600">PO # {po.poNumber}</p> : null}
        </div>
      </header>

      <div className="mb-3 grid gap-3 border-b border-neutral-200 pb-3 sm:grid-cols-2 print:grid-cols-2">
        <div className="min-w-0">
          {billing ? <p className="whitespace-pre-wrap text-xs text-neutral-800">{billing}</p> : null}
          {showShipTo ? (
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600">Ship to</p>
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-neutral-800">{shipping}</p>
            </div>
          ) : null}
          <p className="mt-1.5 text-xs text-neutral-800">
            <span className="text-neutral-600">Payment terms: </span>
            <span className="font-medium">{paymentTerms || "—"}</span>
          </p>
        </div>
        <div className="min-w-0 sm:text-right print:text-right">
          <p className={sectionLabel + " sm:text-right"}>Vendor</p>
          {vendorToLines.length ? (
            <div className="space-y-1 sm:ml-auto sm:text-right">
              <p className="whitespace-pre-wrap text-xs font-medium text-neutral-900">{vendorToLines[0]}</p>
              {vendorToLines.slice(1).map((line, i) => (
                <p key={i} className="whitespace-pre-wrap text-xs text-neutral-800 sm:ml-auto sm:text-right">
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500">—</p>
          )}
        </div>
      </div>

      <section className="mb-3">
        <h2 className={sectionLabel}>Purchase order info</h2>
        <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-neutral-600">PO#</dt>
            <dd className="font-medium text-neutral-900">{po.poNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Date</dt>
            <dd className="text-neutral-900">{po.formattedCreatedAt || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Status</dt>
            <dd className="text-neutral-900">{po.status || "—"}</dd>
          </div>
          <div>
            <dt className="text-neutral-600">Delivery</dt>
            <dd className="text-neutral-900">{po.deliveryStatus || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-3">
        <h2 className={sectionLabel}>Line items</h2>
        <table className={tableWrap + " w-full"}>
          <thead className={thRow}>
            <tr>
              <th className={thCell + " text-left"}>Description</th>
              <th className={thCell + " w-10 text-right"}>Qty</th>
              <th className={thCell + " w-12"}>UOM</th>
              <th className={thCell + " w-[4.5rem] text-right"}>Unit price</th>
              <th className={thCell + " w-10 text-right"}>Tax %</th>
              <th className={thCell + " w-[4.5rem] text-right"}>Tax</th>
              <th className={thCell + " w-[5rem] text-right"}>Total</th>
              <th className={thCell + " w-[4.5rem]"}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(po.lineItems) ? po.lineItems : []).map((row, i) => {
              const taxPct = parsePoLineTaxPercent(row?.taxPercent);
              const taxVal = poLineTaxAmount(row);
              const lineTot = poLineTotalWithTax(row);
              return (
                <tr key={i}>
                  <td className={tdCell + " align-top whitespace-pre-wrap"}>{row?.description || "—"}</td>
                  <td className={tdCell + " text-right tabular-nums"}>{row?.qty ?? "—"}</td>
                  <td className={tdCell}>{row?.uom || "—"}</td>
                  <td className={tdCell + " text-right tabular-nums"}>
                    {row?.unitPrice != null && row.unitPrice !== "" ? formatMoney(row.unitPrice) : "—"}
                  </td>
                  <td className={tdCell + " text-right tabular-nums"}>{taxPct ? `${taxPct}%` : "0%"}</td>
                  <td className={tdCell + " text-right tabular-nums"}>
                    {taxVal != null && Number.isFinite(taxVal) ? formatMoney(String(taxVal.toFixed(2))) : "—"}
                  </td>
                  <td className={tdCell + " text-right tabular-nums"}>
                    {lineTot != null && Number.isFinite(lineTot)
                      ? formatMoney(String(lineTot.toFixed(2)))
                      : "—"}
                  </td>
                  <td className={tdCell}>{row?.status ?? "Ordered"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mb-3">
        <h2 className={sectionLabel}>Totals</h2>
        <table className="w-full border border-neutral-300 text-xs tabular-nums print:text-[11px]">
          <tbody>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <td className="px-2 py-1.5 font-medium text-neutral-800">Order total</td>
              <td className="px-2 py-1.5 text-right font-medium text-neutral-900">{formatMoney(po.totalOrder)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">Total invoiced</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{formatMoney(po.totalInvoiced)}</td>
            </tr>
            <tr className="border-b border-neutral-200">
              <td className="px-2 py-1.5 text-neutral-800">Total paid</td>
              <td className="px-2 py-1.5 text-right text-neutral-900">{formatMoney(po.totalPaid)}</td>
            </tr>
            <tr className="bg-neutral-100">
              <td className="px-2 py-2 text-sm font-bold text-neutral-900">{balanceDueLabel}</td>
              <td className="px-2 py-2 text-right text-sm font-bold text-neutral-900">
                {formatMoney(balanceDueDisplay)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {String(po.notes || "").trim() ? (
        <section className="mb-3">
          <h2 className={sectionLabel}>Notes</h2>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-800">{po.notes}</p>
        </section>
      ) : null}

      <InvoicePaymentFooterPrint
        paymentOptions={po.invoicePaymentOptions ?? settings?.invoicePaymentOptions}
        thankYouNote={po.invoiceThankYouNote ?? settings?.invoiceThankYouNote}
        variant="dashboard"
        compact
      />
    </div>
  );
}
