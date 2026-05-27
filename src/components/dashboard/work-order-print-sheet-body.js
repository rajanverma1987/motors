"use client";

import { PrintShopLogo } from "@/components/dashboard/print-shop-logo";
import {
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  JOB_TYPE_OPTIONS,
} from "@/lib/work-order-fields";

const sectionLabel = "mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600";

function jobTypeLabel(value) {
  return JOB_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || "—";
}

function specRows(fields, specs) {
  const bag = specs && typeof specs === "object" ? specs : {};
  return fields
    .map(({ key, label }) => {
      const v = String(bag[key] ?? "").trim();
      if (!v) return null;
      return { label, value: v };
    })
    .filter(Boolean);
}

function SpecSection({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <section className="mb-4 break-inside-avoid">
      <h2 className={sectionLabel}>{title}</h2>
      <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2 print:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex gap-2 border-b border-neutral-100 py-1">
            <dt className="shrink-0 font-medium text-neutral-600">{label}</dt>
            <dd className="min-w-0 text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Printable work order body (matches {@link buildWorkOrderPdfBuffer} content).
 */
export default function WorkOrderPrintSheetBody({ workOrder: wo }) {
  if (!wo) return null;

  const shopName = String(wo.fromShopName || "Motor shop").trim();
  const woNum = String(wo.workOrderNumber || "").trim() || "—";
  const scopeLines = (wo.quoteScopeForTech || [])
    .map((r) => String(r?.scope ?? "").trim())
    .filter(Boolean);
  const otherRows = (wo.quoteOtherCostForTech || []).filter((r) => String(r?.item ?? "").trim());

  const headerPairs = [
    ["Date", wo.date || "—"],
    ["RFQ#", wo.quoteRfqNumber || "—"],
    ["Company", wo.customerCompany || wo.companyName || "—"],
    ["Technician", wo.technicianName || "—"],
    ["Job type", jobTypeLabel(wo.jobType)],
    ["Status", wo.status || "—"],
    ["Motor class", wo.motorClass || "—"],
  ];

  return (
    <div className="mx-auto max-w-[52.8rem] bg-white text-sm leading-snug text-neutral-900 print:max-w-none print:text-black">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b-2 border-neutral-800 pb-3 print:border-black">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <PrintShopLogo logoUrl={wo.fromShopLogoUrl} alt="" />
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight text-neutral-900 print:text-[13pt] print:font-extrabold">
              {shopName}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 print:text-[26pt] print:font-black">
            Work order
          </h1>
          <p className="mt-1 text-base font-bold tabular-nums text-neutral-900 print:text-[15pt] print:font-extrabold">
            {woNum}
          </p>
        </div>
      </header>

      <dl className="mb-4 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 print:grid-cols-2">
        {headerPairs.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="shrink-0 font-semibold text-neutral-600">{label}</dt>
            <dd className="min-w-0 text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>

      {wo.notes?.trim() ? (
        <section className="mb-4 break-inside-avoid">
          <h2 className={sectionLabel}>Notes</h2>
          <p className="whitespace-pre-wrap text-xs text-neutral-900">{String(wo.notes).trim()}</p>
        </section>
      ) : null}

      {scopeLines.length > 0 ? (
        <section className="mb-4 break-inside-avoid">
          <h2 className={sectionLabel}>Scope from quote</h2>
          <ul className="list-inside list-disc space-y-1 text-xs text-neutral-900">
            {scopeLines.map((line, i) => (
              <li key={i} className="whitespace-pre-wrap pl-1">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {otherRows.length > 0 ? (
        <section className="mb-4 break-inside-avoid">
          <h2 className={sectionLabel}>Other cost items</h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-300 text-left">
                <th className="py-1.5 pr-2 font-semibold text-neutral-600">Item</th>
                <th className="py-1.5 pr-2 text-right font-semibold text-neutral-600">Qty</th>
                <th className="py-1.5 font-semibold text-neutral-600">UOM</th>
              </tr>
            </thead>
            <tbody>
              {otherRows.map((row, i) => (
                <tr key={i} className="border-t border-neutral-200">
                  <td className="py-1 pr-2 text-neutral-900">{row.item || "—"}</td>
                  <td className="py-1 pr-2 text-right tabular-nums text-neutral-900">{row.qty || "—"}</td>
                  <td className="py-1 text-neutral-700">{row.uom || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {wo.motorClass === "AC" ? (
        <SpecSection
          title="AC motor — winding & mechanical"
          rows={specRows(AC_WORK_ORDER_FIELDS, wo.acSpecs)}
        />
      ) : null}

      {wo.motorClass === "DC" ? (
        <>
          <SpecSection title="DC motor" rows={specRows(DC_WORK_ORDER_FIELDS, wo.dcSpecs)} />
          <SpecSection title="Armature" rows={specRows(DC_ARMATURE_FIELDS, wo.armatureSpecs)} />
        </>
      ) : null}

      <footer className="mt-6 border-t border-neutral-200 pt-2 text-center text-[10px] text-neutral-500">
        Generated {new Date().toLocaleString()}
      </footer>
    </div>
  );
}
