"use client";

import Badge from "@/components/ui/badge";

/** Card wrapper used by every IQMotorTrack panel so spacing stays identical. */
export function TrackCard({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-4 ${className}`.trim()}>
      {title || action ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          {title ? <h3 className="text-sm font-bold text-title">{title}</h3> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Label / value row. Missing values render as "Not provided", never as blank or zero. */
export function TrackRow({ label, value, hideEmpty = false }) {
  const text = value === null || value === undefined || String(value).trim() === "" ? "" : String(value);
  if (!text && hideEmpty) return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="shrink-0 text-xs text-secondary">{label}</span>
      <span className="min-w-0 break-words text-right text-xs font-semibold text-title">
        {text || "Not provided"}
      </span>
    </div>
  );
}

export function TrackEmpty({ title, message, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <p className="font-semibold text-title">{title}</p>
      {message ? <p className="mt-1 text-sm text-secondary">{message}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function TrackStat({ label, value, variant = "default" }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-center">
      <p className="text-lg font-extrabold leading-tight text-title">{value}</p>
      <Badge variant={variant} className="mt-1 rounded-full px-2 py-0.5 text-[10px]">
        {label}
      </Badge>
    </div>
  );
}

/** Full-height sub screen that slides over the tab content. */
export function TrackScreen({ title, subtitle, onBack, actions, children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md px-2 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          Back
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-title">{title}</p>
          {subtitle ? <p className="truncate text-[11px] text-secondary">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export function trackDateLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function trackDateInputValue(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
