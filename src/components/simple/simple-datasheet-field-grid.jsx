"use client";

import SimpleDoubleClickTextEditInput from "@/components/simple/simple-double-click-text-edit-input";

/** Shared datasheet field grid — used by Datasheet modal and Master Data Search. */

export const DATASHEET_FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";

/** Filled criteria highlight (Master Data Search after Search). */
export const DATASHEET_FIELD_INPUT_FILLED =
  "h-7 w-full min-w-0 rounded-none border border-primary bg-primary/15 px-1.5 text-sm font-medium text-title outline-none ring-1 ring-primary/40 focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/25 dark:text-title";

/** Allow wrap so long titles never overlap inputs; column width keeps labels aligned. */
const FIELD_LABEL =
  "min-w-0 whitespace-normal break-words text-right text-xs font-bold leading-tight text-title";

/**
 * Label + input row. Input column always takes remaining width (minmax floor prevents tiny boxes).
 */
export function DatasheetFieldRow({
  label,
  labelWidth = "7rem",
  inputMinWidth = "4.5rem",
  children,
  className = "",
}) {
  return (
    <div
      className={`grid min-w-0 items-center gap-x-2 ${className}`}
      style={{
        gridTemplateColumns: `minmax(0, ${labelWidth}) minmax(${inputMinWidth}, 1fr)`,
      }}
    >
      <label className={FIELD_LABEL}>{label}</label>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}

/**
 * @param {{ key: string, label: string }[][]} columns
 * @param {Record<string, string>} values
 * @param {(key: string, value: string) => void} onFieldChange
 * @param {boolean} [highlightFilled] — when true, non-empty inputs use a filled highlight style
 * @param {boolean} [dense] — tighter labels / wider inputs (Master Data Search side panel)
 * @param {number} [editModalZIndex]
 */
export default function DatasheetFieldGrid({
  columns,
  values,
  onFieldChange,
  labelWidth,
  inputMinWidth,
  inputClassName = DATASHEET_FIELD_INPUT,
  filledInputClassName = DATASHEET_FIELD_INPUT_FILLED,
  highlightFilled = false,
  dense = false,
  editModalZIndex = 170,
}) {
  const resolvedLabelWidth = labelWidth || (dense ? "6.5rem" : "7.5rem");
  const resolvedInputMin = inputMinWidth || (dense ? "5.5rem" : "4.5rem");

  return (
    <div
      className={
        dense
          ? "grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3"
          : "grid grid-cols-1 gap-x-4 gap-y-1.5 md:grid-cols-2 lg:grid-cols-3"
      }
    >
      {(Array.isArray(columns) ? columns : []).map((col, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-col gap-1.5">
          {(Array.isArray(col) ? col : []).map((field) => {
            const value = values?.[field.key] ?? "";
            const isFilled = highlightFilled && String(value).trim() !== "";
            return (
              <DatasheetFieldRow
                key={field.key}
                label={field.label}
                labelWidth={resolvedLabelWidth}
                inputMinWidth={resolvedInputMin}
              >
                <SimpleDoubleClickTextEditInput
                  label={field.label}
                  value={value}
                  onChange={(next) => onFieldChange(field.key, next)}
                  className={isFilled ? filledInputClassName : inputClassName}
                  aria-label={field.label}
                  data-filled={isFilled ? "true" : undefined}
                  zIndex={editModalZIndex}
                />
              </DatasheetFieldRow>
            );
          })}
        </div>
      ))}
    </div>
  );
}
