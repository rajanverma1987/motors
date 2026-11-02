/**
 * Simple portal form & embedded table typography.
 * Uses Tailwind rem classes so Settings → Display (zoom + font size) scales proportionally.
 */

/** Right-aligned compact field labels (motor block, PO meta, etc.). */
export const SIMPLE_FIELD_LABEL =
  "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";

/** Standard single-line inputs on Simple forms. */
export const SIMPLE_FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";

/** Standard textareas on Simple forms. */
export const SIMPLE_FIELD_TEXTAREA =
  "w-full min-w-0 flex-1 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";

/** Header / toolbar buttons on Simple modals. */
export const SIMPLE_TOOLBAR_BTN =
  "h-9 shrink-0 rounded-none px-2.5 py-2 text-xs font-semibold";

/** Editable cells in line-item grids (quotes, PO lines). */
export const SIMPLE_CELL_INPUT =
  "h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-1 text-sm font-semibold text-title outline-none focus:bg-primary/[0.06] focus:ring-1 focus:ring-inset focus:ring-primary dark:focus:bg-primary/10 dark:text-title";

export const SIMPLE_CELL_INPUT_MUTED = `${SIMPLE_CELL_INPUT} !bg-muted/40`;

export const SIMPLE_LINE_CELL =
  "border border-solid border-[hsl(var(--title)/0.35)] bg-card p-0 dark:border-[hsl(var(--title)/0.4)]";

export const SIMPLE_LINE_HEAD =
  "border border-solid border-[hsl(var(--title)/0.35)] bg-primary/[0.04] px-1 py-1.5 text-xs font-bold text-title dark:border-[hsl(var(--title)/0.4)]";

/** Embedded summary tables (e.g. purchase orders on service proposal). */
export const SIMPLE_TABLE_TEXT = "text-sm text-title";
export const SIMPLE_TABLE_HEAD = "text-xs font-bold text-title";

/** Status pills in compact tables. */
export const SIMPLE_BADGE_SM = "rounded-full px-2 py-0.5 text-xs";

/** Totals row labels/inputs on line-item forms. */
export const SIMPLE_TOTAL_LABEL = "!text-sm !font-bold";
export const SIMPLE_TOTAL_INPUT =
  "h-8 text-right text-sm font-bold tabular-nums";
