"use client";

/** Approximate relative luminance (0–1) for hex/rgb CSS colors. */
function relativeLuminance(cssColor) {
  if (!cssColor || typeof cssColor !== "string") return null;
  const s = cssColor.trim();
  let r;
  let g;
  let b;
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else {
    const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgb) return null;
    r = Number(rgb[1]);
    g = Number(rgb[2]);
    b = Number(rgb[3]);
  }
  const lin = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function isLightCssColor(cssColor) {
  const L = relativeLuminance(cssColor);
  return L != null && L > 0.65;
}

/**
 * Icon sits on the white/card surface — never use a light text color meant for a dark badge fill.
 * Prefer dark tile text; if text is white/light, use the tile background accent instead.
 */
function iconColorOnCard(tileBg, tileText) {
  if (tileText && !isLightCssColor(tileText)) return tileText;
  if (tileBg && !isLightCssColor(tileBg)) return tileBg;
  if (tileText) return tileText;
  return tileBg || undefined;
}

/**
 * Status summary filter chip — compact neutral card with a status-color accent.
 * Keeps Settings tile colors on the rail / count badge; label stays readable.
 */
export default function StatusFilterPillButton({
  card,
  active,
  onClick,
  formatAmount,
  readOnly = false,
  amountOnly = false,
  className = "",
  /** When true, only the label row is shown (no subtitle / count line). */
  labelOnly = false,
}) {
  const amountText =
    typeof formatAmount === "function" ? formatAmount(card.amount) : String(card.amount ?? "");
  const tileStyle = card.tileAppearance?.style || {};
  const tileBg = tileStyle.backgroundColor;
  const tileText = tileStyle.color;
  const tileTokens = String(card.tileAppearance?.className || "").split(/\s+/).filter(Boolean);
  const tileBgClassName = tileTokens
    .filter((c) => /^(bg-|dark:bg-|from-|to-|via-)/.test(c))
    .join(" ");
  const tileTextClassName = tileTokens
    .filter((c) => /^(text-|dark:text-)/.test(c))
    .join(" ");
  const tileClassName = [tileBgClassName, tileTextClassName].filter(Boolean).join(" ");
  const Icon = typeof card.icon === "function" ? card.icon : null;

  const hasCustomSubtitle = card.subtitle != null && String(card.subtitle).trim() !== "";
  const customSubtitle = hasCustomSubtitle ? String(card.subtitle) : "";
  const showStats = !labelOnly;

  const railStyle = tileBg ? { backgroundColor: tileBg } : undefined;
  const countBadgeStyle =
    tileBg || tileText
      ? {
          ...(tileBg ? { backgroundColor: tileBg } : {}),
          ...(tileText ? { color: tileText } : {}),
        }
      : undefined;
  const iconColor = iconColorOnCard(tileBg, tileText);
  const iconStyle = iconColor ? { color: iconColor } : undefined;

  const shellClass = [
    "status-filter-pill group relative inline-flex cursor-pointer overflow-hidden rounded-lg border text-left transition-all duration-150",
    "bg-card shadow-sm",
    active
      ? "border-primary ring-1 ring-primary/35"
      : "border-border hover:border-primary/40 hover:shadow",
    labelOnly ? "min-w-0 items-center" : "min-w-[8.25rem] max-w-[14rem] flex-col",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const rail = (
    <span
      className={`absolute inset-y-0 left-0 w-1 ${tileBg ? "" : tileBgClassName || "bg-primary/50"}`}
      style={railStyle}
      aria-hidden
    />
  );

  const body = (
    <span className={`block min-w-0 pl-3.5 ${labelOnly ? "px-3 py-0" : "pr-3 pt-2.5 pb-2.5"}`}>
      <span className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <Icon
            className={`h-4 w-4 shrink-0 ${
              iconStyle ? "" : tileTextClassName || "text-primary"
            }`}
            style={iconStyle}
            aria-hidden
          />
        ) : null}
        <span
          className="min-w-0 flex-1 truncate text-xs font-semibold leading-snug text-title"
          title={card.label}
        >
          {card.label}
        </span>
        {showStats && !amountOnly && !hasCustomSubtitle ? (
          <span
            className={`inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-1.5 text-[11px] font-bold tabular-nums leading-none ${
              countBadgeStyle ? "" : tileClassName || "bg-primary/15 text-primary"
            }`}
            style={countBadgeStyle}
          >
            {card.count ?? 0}
          </span>
        ) : null}
      </span>
      {showStats ? (
        hasCustomSubtitle || amountOnly ? (
          <span className="mt-1.5 block truncate text-sm font-semibold tabular-nums text-secondary">
            {hasCustomSubtitle ? customSubtitle : amountText}
          </span>
        ) : (
          <span className="mt-1.5 block truncate text-sm font-bold tabular-nums text-title">
            {amountText}
          </span>
        )
      ) : null}
    </span>
  );

  if (readOnly) {
    return (
      <div className={shellClass.replace("cursor-pointer", "")} role="group" aria-label={card.label}>
        {rail}
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={shellClass}
      aria-pressed={active}
      title={card.label}
    >
      {rail}
      {body}
    </button>
  );
}
