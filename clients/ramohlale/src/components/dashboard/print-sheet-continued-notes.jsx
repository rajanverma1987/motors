"use client";

const sectionLabel = "mb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-600";

/**
 * Customer / internal notes block for print sheets.
 * Flows after totals (no forced page break) so empty space after Grand total is used.
 * If notes do not fit, the browser naturally continues onto the next page.
 */
export default function PrintSheetContinuedNotes({
  notesHeading = "Customer notes",
  notesText = "",
  children = null,
}) {
  const text = String(notesText || "").trim();
  if (!text) return null;

  return (
    <div className="print-notes-block mt-2">
      <section className="mb-2 break-inside-avoid">
        <h2 className={sectionLabel}>{notesHeading}</h2>
        <p className="min-h-[2.5rem] whitespace-pre-wrap rounded border border-neutral-200 bg-neutral-50/60 px-2 py-1.5 text-xs leading-relaxed text-neutral-900">
          {text}
        </p>
      </section>
      {children}
    </div>
  );
}
