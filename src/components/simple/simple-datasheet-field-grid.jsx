"use client";

/** Shared datasheet field grid — used by Datasheet modal and Master Data Search. */

export const DATASHEET_FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";

/** Filled criteria highlight (Master Data Search after Search). */
export const DATASHEET_FIELD_INPUT_FILLED =
  "h-7 w-full min-w-0 rounded-none border border-primary bg-primary/15 px-1.5 text-sm font-medium text-title outline-none ring-1 ring-primary/40 focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/25 dark:text-title";

/** Allow wrap so long titles never overlap inputs; fixed width keeps input column aligned. */
const FIELD_LABEL =
  "shrink-0 whitespace-normal break-words text-right text-xs font-bold leading-tight text-title";

export function DatasheetFieldRow({ label, labelWidth = "10.5rem", children, className = "" }) {
  return (
    <div className={`flex min-w-0 items-start gap-2 ${className}`}>
      <label
        className={FIELD_LABEL}
        style={{ width: labelWidth, maxWidth: labelWidth }}
      >
        {label}
      </label>
      <div className="min-w-0 flex-1 pt-0.5">{children}</div>
    </div>
  );
}

/**
 * @param {{ key: string, label: string }[][]} columns
 * @param {Record<string, string>} values
 * @param {(key: string, value: string) => void} onFieldChange
 * @param {boolean} [highlightFilled] — when true, non-empty inputs use a filled highlight style
 */
export default function DatasheetFieldGrid({
  columns,
  values,
  onFieldChange,
  labelWidth = "10.5rem",
  inputClassName = DATASHEET_FIELD_INPUT,
  filledInputClassName = DATASHEET_FIELD_INPUT_FILLED,
  highlightFilled = false,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {(Array.isArray(columns) ? columns : []).map((col, colIdx) => (
        <div key={colIdx} className="flex min-w-0 flex-col gap-1.5">
          {(Array.isArray(col) ? col : []).map((field) => {
            const value = values?.[field.key] ?? "";
            const isFilled = highlightFilled && String(value).trim() !== "";
            return (
              <DatasheetFieldRow key={field.key} label={field.label} labelWidth={labelWidth}>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onFieldChange(field.key, e.target.value)}
                  className={isFilled ? filledInputClassName : inputClassName}
                  aria-label={field.label}
                  data-filled={isFilled ? "true" : undefined}
                />
              </DatasheetFieldRow>
            );
          })}
        </div>
      ))}
    </div>
  );
}
