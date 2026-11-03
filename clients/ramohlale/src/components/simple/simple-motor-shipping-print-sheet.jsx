"use client";

import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";

function textValue(value) {
  return String(value ?? "").trim();
}

function DetailRow({ label, value }) {
  return (
    <tr>
      <th className="w-[7.5rem] border border-black/20 bg-neutral-100 px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-black/70">
        {label}
      </th>
      <td className="border border-black/20 px-2 py-1 text-xs font-semibold text-black">{textValue(value) || " "}</td>
    </tr>
  );
}

/**
 * Printable delivery note (off-screen + window.print).
 */
export default function SimpleMotorShippingPrintSheet({
  entry = {},
  customerName = "",
  companyName = "",
  customerEmail = "",
  customerPhone = "",
  paidByLabel = "",
  manufacturer = "",
  hpKw = "",
  frameType = "",
  modelNumber = "",
}) {
  const { settings } = useUserSettings();
  const formatDate = useFormatDate();
  const logoUrl = String(settings?.logoUrl || "").trim();
  const shopName = String(companyName || settings?.shopName || "").trim();
  const dateLabel = entry.date ? formatDate(entry.date) || textValue(entry.date) : "";
  const invoiceNumber = textValue(entry.invoiceNumber);
  const notes = textValue(entry.notes);
  const chargeBack = entry.chargeBackToClient ? "Yes" : "No";

  return (
    <div
      className="delivery-note-print bg-white text-black"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
        <div className="flex min-w-0 items-center gap-4">
          <PrintShopLogo logoUrl={logoUrl} alt={shopName || "Shop"} />
          <div className="min-w-0">
            {shopName ? <p className="text-lg font-bold leading-tight tracking-tight">{shopName}</p> : null}
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-black/60">Delivery note</p>
          </div>
        </div>
        <div className="w-44 shrink-0 border border-black">
          <div className="border-b border-black bg-black px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            Delivery Notes
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-black/55">Invoice</p>
            <p className="text-base font-bold leading-tight">{invoiceNumber || " "}</p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-black/55">Date</p>
            <p className="text-sm font-semibold leading-tight">{dateLabel || " "}</p>
          </div>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <article className="border border-black/80">
          <h2 className="border-b border-black/80 bg-black px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            Deliver to
          </h2>
          <div className="space-y-0.5 px-3 py-2">
            <p className="text-base font-bold leading-snug">{textValue(customerName) || " "}</p>
            <p className="text-sm">
              <span className="text-black/55">Phone </span>
              <span className="font-semibold">{textValue(customerPhone) || " "}</span>
            </p>
            <p className="break-all text-sm">
              <span className="text-black/55">Email </span>
              <span className="font-semibold">{textValue(customerEmail) || " "}</span>
            </p>
          </div>
        </article>
        <article className="border border-black/80">
          <h2 className="border-b border-black/80 bg-black px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            References
          </h2>
          <div className="space-y-1 px-3 py-2 text-sm">
            <p>
              <span className="text-black/55">PO number </span>
              <span className="font-semibold">{textValue(entry.shippingPo) || " "}</span>
            </p>
            <p>
              <span className="text-black/55">Invoice </span>
              <span className="font-semibold">{invoiceNumber || " "}</span>
            </p>
            <p>
              <span className="text-black/55">Date </span>
              <span className="font-semibold">{dateLabel || " "}</span>
            </p>
          </div>
        </article>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/70">Machine</h2>
          <table className="w-full border-collapse">
            <tbody>
              <DetailRow label="Manufacturer" value={manufacturer} />
              <DetailRow label="HP/KW" value={hpKw} />
              <DetailRow label="Frame/Type" value={frameType} />
              <DetailRow label="Model#" value={modelNumber} />
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/70">Delivery details</h2>
          <table className="w-full border-collapse">
            <tbody>
              <DetailRow label="Transport" value={entry.mannerOfTransport} />
              <DetailRow label="Freight" value={entry.freight} />
              <DetailRow label="Picked by" value={entry.pickedBy} />
              <DetailRow label="Charges" value={entry.charges} />
              <DetailRow label="Paid by" value={paidByLabel || entry.paidBy} />
              <DetailRow label="Charge back" value={chargeBack} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-3">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/70">Notes</h2>
        <div className="min-h-[2.25rem] whitespace-pre-wrap border border-black/30 bg-neutral-50 px-3 py-2 text-sm leading-snug">
          {notes || " "}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-6">
        {["Received by", "Signature", "Date"].map((label) => (
          <div key={label}>
            <div className="h-6 border-b border-black" />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-black/55">{label}</p>
          </div>
        ))}
      </section>

      <p className="mt-3 border-t border-black/15 pt-1.5 text-[10px] leading-relaxed text-black/55">
        Please check the goods on delivery and note any shortage or damage before signing.
      </p>
    </div>
  );
}
