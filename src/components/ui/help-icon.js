/**
 * Help "?" icon shown after labels. Shows tooltip with info on hover.
 */
export default function HelpIcon({ text, className = "" }) {
  if (!text) return null;
  return (
    <span
      className={`group relative inline-flex cursor-help align-middle ${className}`}
      role="img"
      aria-label="Help"
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card text-xs text-secondary hover:text-text hover:border-border">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-max max-w-xs -translate-x-1/2 rounded border border-border bg-card px-2 py-1 text-xs text-text shadow-lg opacity-0 transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
