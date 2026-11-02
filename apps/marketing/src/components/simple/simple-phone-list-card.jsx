"use client";

/**
 * Compact list row for Simple hub on phones.
 * Outer shell is a div so action controls can be real buttons without nesting.
 * Pass `children` for a fully custom body; otherwise use title / subtitle / badge / meta.
 * @param {{
 *   title?: React.ReactNode,
 *   subtitle?: React.ReactNode,
 *   meta?: React.ReactNode,
 *   badge?: React.ReactNode,
 *   actions?: React.ReactNode,
 *   onClick?: () => void,
 *   className?: string,
 *   children?: React.ReactNode,
 * }} props
 */
export default function SimplePhoneListCard({
  title,
  subtitle,
  meta,
  badge,
  actions,
  onClick,
  className = "",
  children = null,
}) {
  const interactive = typeof onClick === "function";

  const details =
    children != null ? (
      children
    ) : (
      <>
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-bold text-title">{title}</p>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-secondary">{subtitle}</p>
        ) : null}
        {meta ? <div className="mt-1.5 text-xs text-secondary">{meta}</div> : null}
      </>
    );

  return (
    <div
      className={`flex w-full items-start gap-2 rounded-none border border-border bg-card px-3 py-2.5 ${
        interactive ? "transition-colors hover:bg-primary/5" : ""
      } ${className}`}
    >
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">{actions}</div>
      ) : null}
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 rounded-none bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {details}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{details}</div>
      )}
    </div>
  );
}
