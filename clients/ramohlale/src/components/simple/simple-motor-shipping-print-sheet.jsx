"use client";

import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";

function textValue(value) {
  return String(value ?? "").trim();
}

function shown(value) {
  return textValue(value) || "-";
}

function DetailRow({ label, value }) {
  return (
    <tr>
      <th className="w-[7.5rem] border border-neutral-300 bg-neutral-100 px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-700">
        {label}
      </th>
      <td className="border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-900">{shown(value)}</td>
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
  const siteName = textValue(entry.siteName);
  const notes = textValue(entry.notes);

  return (
    <div
      className="delivery-note-print mx-auto max-w-[52.8rem] bg-white text-sm leading-snug text-neutral-900 print:max-w-none print:text-black"
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      <header className="mb-2 border-b border-neutral-300 pb-1.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <div className="min-w-0 justify-self-start">
            <PrintShopLogo logoUrl={logoUrl} alt={shopName || "Shop"} />
          </div>
          <h1 className="px-2 text-center text-3xl font-bold tracking-tight text-neutral-900 print:text-[22pt]">
            Delivery Note
          </h1>
          <div className="min-w-0 shrink-0 justify-self-end text-right">
            <p className="mt-0.5 text-xl font-bold leading-tight tracking-tight text-neutral-900 print:text-[16pt]">
              {invoiceNumber || "-"}
            </p>
            <p className="mt-1.5 text-xs text-neutral-800">
              <span className="font-semibold">PO: </span>
              {shown(entry.shippingPo)}
            </p>
            <p className="text-xs text-neutral-800">
              <span className="font-semibold">Date: </span>
              {dateLabel || "-"}
            </p>
          </div>
        </div>
        {shopName ? (
          <div className="mt-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600">From</p>
            <p className="text-sm font-semibold text-neutral-900">{shopName}</p>
          </div>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-3">
        <article className="min-w-0 border border-neutral-300">
          <h2 className="border-b border-neutral-300 bg-neutral-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            Deliver to
          </h2>
          <div className="space-y-0.5 px-3 py-2">
            <p className="text-base font-bold leading-snug text-neutral-900">{shown(customerName)}</p>
            <p className="text-sm text-neutral-800">
              <span className="text-neutral-500">Site name </span>
              <span className="font-semibold">{siteName || "-"}</span>
            </p>
            <p className="text-sm text-neutral-800">
              <span className="text-neutral-500">Phone </span>
              <span className="font-semibold">{shown(customerPhone)}</span>
            </p>
            <p className="break-all text-sm text-neutral-800">
              <span className="text-neutral-500">Email </span>
              <span className="font-semibold">{shown(customerEmail)}</span>
            </p>
          </div>
        </article>
        <article className="min-w-0">
          <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
            Delivery details
          </h2>
          <table className="w-full border-collapse">
            <tbody>
              <DetailRow label="Transport" value={entry.mannerOfTransport} />
              <DetailRow label="Picked by" value={entry.pickedBy} />
            </tbody>
          </table>
        </article>
      </section>

      <section className="mt-3">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">Machine</h2>
        <table className="w-full border-collapse">
          <tbody>
            <DetailRow label="Manufacturer" value={manufacturer} />
            <DetailRow label="HP/KW" value={hpKw} />
            <DetailRow label="Frame/Type" value={frameType} />
            <DetailRow label="Model#" value={modelNumber} />
          </tbody>
        </table>
      </section>

      <section className="mt-3">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">Notes</h2>
        <div className="min-h-[2.25rem] whitespace-pre-wrap border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm leading-snug text-neutral-900">
          {notes || " "}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-6">
        {["Received by", "Signature", "Date"].map((label) => (
          <div key={label}>
            <div className="h-6 border-b border-neutral-900" />
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
          </div>
        ))}
      </section>

      <p className="mt-3 border-t border-neutral-200 pt-1.5 text-[10px] leading-relaxed text-neutral-500">
        Please check the goods on delivery and note any shortage or damage before signing.
      </p>
    </div>
  );
}
