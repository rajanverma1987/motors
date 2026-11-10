"use client";

import {
  sumPoLineExtendedPreTax,
  sumPoLineItemsTaxInclusive,
  sumPoLineTaxAmount,
} from "@/lib/po-line-item-totals";

export default function PoLineItemsTotalsTable({ lines, otherCharges = [], fmt }) {
  const arr = Array.isArray(lines) ? lines : [];
  const orderSubtotal = sumPoLineExtendedPreTax(arr);
  const totalTax = sumPoLineTaxAmount(arr);
  const lineGrand = sumPoLineItemsTaxInclusive(arr);
  const otherChargesList = Array.isArray(otherCharges) ? otherCharges : [];
  const otherChargesTotal = otherChargesList.reduce((sum, row) => {
    const n = parseFloat(row?.amount ?? "0");
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const grandTotal = lineGrand + otherChargesTotal;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
      <table className="ml-auto w-full max-w-md text-sm">
        <tbody>
          <tr className="border-b border-border">
            <td className="px-3 py-2 text-secondary">Order total</td>
            <td className="px-3 py-2 text-right font-medium tabular-nums text-title">{fmt(orderSubtotal)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="px-3 py-2 text-secondary">Total tax</td>
            <td className="px-3 py-2 text-right font-medium tabular-nums text-title">{fmt(totalTax)}</td>
          </tr>
          {otherChargesList.map((row, i) => (
            <tr key={row.logisticsEntryId || `other-${i}`} className="border-b border-border">
              <td className="px-3 py-2 text-secondary">Other charges</td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-title">
                {row?.amount ? fmt(row.amount) : "—"}
              </td>
            </tr>
          ))}
          <tr className="border-t border-border bg-muted/30">
            <td className="px-3 py-2 font-semibold text-title">Grand total</td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-title">{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
