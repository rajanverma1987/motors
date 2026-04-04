"use client";

import PoVendorAccountsSection from "@/components/dashboard/po-vendor-accounts-section";

/**
 * Printable purchase order (dashboard). Used by PoPrintPreview.
 */
export default function PoPrintSheetBody({ po, vendor, rfqNumber, settings, fmt }) {
  if (!po) return null;

  const formatMoney = typeof fmt === "function" ? fmt : (v) => (v != null && v !== "" ? String(v) : "—");

  const v = vendor || {};
  const addrLine = [v.address, [v.city, v.state, v.zipCode].filter(Boolean).join(", ")].filter(Boolean).join(" — ");
  const contactLine = [v.phone, v.email].filter(Boolean).join(" | ");

  return (
    <div className="max-w-3xl mx-auto p-6 print:p-4 text-sm text-title">
      {(settings?.accountsBillingAddress || settings?.accountsShippingAddress) && (
        <section className="mb-6 border-b border-border pb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Motor shop (accounts)</h2>
          <PoVendorAccountsSection
            billingAddress={settings?.accountsBillingAddress}
            shippingAddress={settings?.accountsShippingAddress}
          />
        </section>
      )}

      <div className="mb-6 border-b border-border pb-4">
        {po.poNumber ? <p className="text-sm text-secondary">PO # {po.poNumber}</p> : null}
        <h1 className="text-2xl font-bold text-title">Purchase order</h1>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-secondary">Type</dt>
            <dd className="font-medium">{po.type === "job" ? "Job PO (linked to RFQ)" : "Shop PO"}</dd>
          </div>
          {po.type === "job" && (rfqNumber || po.quoteId) ? (
            <div>
              <dt className="text-secondary">RFQ#</dt>
              <dd className="font-medium">{rfqNumber || "—"}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <section className="mb-6 border-b border-border pb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Vendor</h2>
        <p className="font-semibold text-title">{v.name || po.vendorName || "—"}</p>
        {v.contactName ? <p className="text-sm text-secondary">{v.contactName}</p> : null}
        {addrLine ? <p className="text-sm text-secondary">{addrLine}</p> : null}
        {contactLine ? <p className="text-sm text-secondary">{contactLine}</p> : null}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 pr-4 text-left font-medium text-secondary">Description</th>
              <th className="pb-2 pr-4 text-right font-medium text-secondary">Qty</th>
              <th className="pb-2 pr-4 text-left font-medium text-secondary">UOM</th>
              <th className="pb-2 pr-4 text-right font-medium text-secondary">Unit price</th>
              <th className="pb-2 pr-4 text-right font-medium text-secondary">Total</th>
              <th className="pb-2 text-left font-medium text-secondary">Status</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(po.lineItems) ? po.lineItems : []).map((row, i) => {
              const q = parseFloat(row?.qty ?? "1");
              const p = parseFloat(row?.unitPrice ?? "0");
              const lineNum = Number.isFinite(q) && Number.isFinite(p) ? q * p : null;
              return (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 pr-4 text-title whitespace-pre-wrap">{row?.description || "—"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{row?.qty ?? "—"}</td>
                  <td className="py-2 pr-4 text-title">{row?.uom || "—"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {row?.unitPrice != null && row.unitPrice !== "" ? formatMoney(row.unitPrice) : "—"}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {lineNum != null && Number.isFinite(lineNum) ? formatMoney(lineNum) : "—"}
                  </td>
                  <td className="py-2 text-title">{row?.status ?? "Ordered"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <p className="text-sm font-semibold text-title">Order total: {formatMoney(po.totalOrder)}</p>
      </div>

      {String(po.notes || "").trim() ? (
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-title">{po.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
