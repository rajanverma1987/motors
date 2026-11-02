"use client";

import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";

function cellValue(v) {
  const s = String(v ?? "").trim();
  return s || "—";
}

function PrintMetaRow({ label, value }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5 leading-relaxed">
      <span className="w-36 shrink-0 text-right text-xs font-normal text-black">{label}:</span>
      <span className="min-w-0 flex-1 break-words text-sm font-bold text-black">{cellValue(value)}</span>
    </div>
  );
}

/**
 * Printable Motor Shipping slip (off-screen + window.print).
 */
export default function SimpleMotorShippingPrintSheet({
  entry = {},
  customerName = "",
  companyName = "",
  customerEmail = "",
  customerPhone = "",
  paidByLabel = "",
}) {
  const { settings } = useUserSettings();
  const formatDate = useFormatDate();
  const logoUrl = String(settings?.logoUrl || "").trim();
  const shopName = String(companyName || settings?.shopName || "").trim();
  const dateLabel = entry.date ? formatDate(entry.date) || entry.date : "—";

  return (
    <div className="bg-white px-1 py-2 text-black">
      <div className="mb-7 border-b-[3px] border-black pb-5">
        <div className="mb-4 flex items-center gap-4">
          <PrintShopLogo logoUrl={logoUrl} alt="" />
          <h1 className="min-w-0 flex-1 text-center text-2xl font-bold tracking-wide">
            Motor Shipping
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 border border-black/25 bg-black/[0.03] px-4 py-3.5">
          <PrintMetaRow label="Customer" value={customerName} />
          <PrintMetaRow label="Company" value={shopName || customerName} />
          <PrintMetaRow label="Phone" value={customerPhone} />
          <PrintMetaRow label="Email" value={customerEmail} />
          <PrintMetaRow label="Invoice #" value={entry.invoiceNumber} />
          <PrintMetaRow label="Date" value={dateLabel} />
        </div>
      </div>

      <div className="space-y-2">
        <PrintMetaRow label="PO Number" value={entry.shippingPo} />
        <PrintMetaRow label="Transport" value={entry.mannerOfTransport} />
        <PrintMetaRow label="Freight" value={entry.freight} />
        <PrintMetaRow label="Picked by" value={entry.pickedBy} />
        <PrintMetaRow label="Charges" value={entry.charges} />
        <PrintMetaRow label="Paid By" value={paidByLabel || entry.paidBy} />
      </div>

      <div className="mt-6">
        <div className="mb-1.5 text-xs font-normal text-black">Notes:</div>
        <div className="min-h-[5rem] whitespace-pre-wrap border border-black/40 p-3 text-sm font-bold leading-relaxed text-black">
          {cellValue(entry.notes) === "—" ? "" : String(entry.notes || "")}
        </div>
      </div>
    </div>
  );
}
