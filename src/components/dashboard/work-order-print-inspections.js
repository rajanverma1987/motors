"use client";

import { inspectionsSectionsForPrint } from "@/lib/work-order-print-helpers";

const sectionLabel = "mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600";

/**
 * Printable inspection findings for a work order.
 * @param {{ inspections?: object[] }} props
 */
export default function WorkOrderPrintInspections({ inspections }) {
  const sections = inspectionsSectionsForPrint(inspections);
  if (!sections.length) return null;

  return (
    <section className="mb-4 break-inside-avoid">
      <h2 className={`${sectionLabel} text-neutral-800`}>Inspections</h2>
      <div className="space-y-4">
        {sections.map((block) => (
          <div key={block.key} className="break-inside-avoid rounded border border-neutral-200 p-3">
            <h3 className="mb-2 text-xs font-bold text-neutral-900">{block.title}</h3>
            <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2 print:grid-cols-2">
              {block.rows.map(({ label, value }) => (
                <div key={`${block.key}-${label}`} className="flex gap-2 border-b border-neutral-100 py-1">
                  <dt className="shrink-0 font-medium text-neutral-600">{label}</dt>
                  <dd className="min-w-0 whitespace-pre-wrap text-neutral-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
