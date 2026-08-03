"use client";

import { useStatusFilterCardDesign } from "@/components/simple/status-filter-card-design";

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

function iconColorOnCard(tileBg, tileText) {
  if (tileText && !isLightCssColor(tileText)) return tileText;
  if (tileBg && !isLightCssColor(tileBg)) return tileBg;
  if (tileText) return tileText;
  return tileBg || undefined;
}

function useTileTokens(card) {
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
  return { tileBg, tileText, tileBgClassName, tileTextClassName, tileClassName };
}

function CountBadge({ count, countBadgeStyle, tileClassName, className = "" }) {
  return (
    <span
      className={`inline-flex h-5 min-w-[1.35rem] shrink-0 items-center justify-center px-1.5 text-[11px] font-bold tabular-nums leading-none ${
        countBadgeStyle ? "" : tileClassName || "bg-primary/15 text-primary"
      } ${className}`}
      style={countBadgeStyle}
    >
      {count}
    </span>
  );
}

function IconWell({ Icon, iconWellStyle, tileBgClassName, tileTextClassName, tileText, iconStyle }) {
  if (!Icon) return null;
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center ${
        iconWellStyle ? "" : tileBgClassName || "bg-primary/12"
      }`}
      style={iconWellStyle}
      aria-hidden
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          iconWellStyle
            ? isLightCssColor(tileText)
              ? "text-white"
              : ""
            : tileTextClassName || "text-primary"
        }`}
        style={iconWellStyle ? (tileText ? { color: tileText } : undefined) : iconStyle}
      />
    </span>
  );
}

function LabelOnlyBody({ Icon, card, iconStyle, tileTextClassName }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 px-2.5 py-1 pl-3">
      {Icon ? (
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${iconStyle ? "" : tileTextClassName || "text-primary"}`}
          style={iconStyle}
          aria-hidden
        />
      ) : null}
      <span className="truncate text-xs font-semibold text-title" title={card.label}>
        {card.label}
      </span>
    </span>
  );
}

/** Strip — top accent bar, icon well, uppercase label, amount below. */
function BodyStrip(props) {
  const {
    Icon,
    card,
    active,
    amountText,
    displayValue,
    showCount,
    count,
    countBadgeStyle,
    tileClassName,
    accentStyle,
    tileBg,
    tileBgClassName,
    iconWellStyle,
    tileTextClassName,
    tileText,
    iconStyle,
  } = props;
  return (
    <>
      <span
        className={`absolute inset-x-0 top-0 h-[3px] ${tileBg ? "" : tileBgClassName || "bg-primary"}`}
        style={accentStyle}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col gap-1 px-2.5 pb-2 pt-2.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <IconWell
            Icon={Icon}
            iconWellStyle={iconWellStyle}
            tileBgClassName={tileBgClassName}
            tileTextClassName={tileTextClassName}
            tileText={tileText}
            iconStyle={iconStyle}
          />
          <span
            className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-secondary"
            title={card.label}
          >
            {card.label}
          </span>
          {showCount ? (
            <CountBadge count={count} countBadgeStyle={countBadgeStyle} tileClassName={tileClassName} />
          ) : null}
        </span>
        <span
          className={`block truncate text-base font-bold leading-none tabular-nums tracking-tight ${
            active ? "text-primary" : "text-title"
          }`}
          title={displayValue}
        >
          {displayValue}
        </span>
      </span>
    </>
  );
}

/** Rail — thick left accent, classic summary card. */
function BodyRail(props) {
  const {
    Icon,
    card,
    active,
    displayValue,
    showCount,
    count,
    countBadgeStyle,
    tileClassName,
    accentStyle,
    tileBg,
    tileBgClassName,
    iconStyle,
    tileTextClassName,
  } = props;
  return (
    <>
      <span
        className={`absolute inset-y-0 left-0 w-1 ${tileBg ? "" : tileBgClassName || "bg-primary"}`}
        style={accentStyle}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col gap-1.5 px-3 py-2.5 pl-3.5">
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon ? (
            <Icon
              className={`h-3.5 w-3.5 shrink-0 ${iconStyle ? "" : tileTextClassName || "text-primary"}`}
              style={iconStyle}
              aria-hidden
            />
          ) : null}
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-title" title={card.label}>
            {card.label}
          </span>
          {showCount ? (
            <CountBadge count={count} countBadgeStyle={countBadgeStyle} tileClassName={tileClassName} />
          ) : null}
        </span>
        <span
          className={`block truncate text-lg font-bold leading-none tabular-nums ${
            active ? "text-primary" : "text-title"
          }`}
          title={displayValue}
        >
          {displayValue}
        </span>
      </span>
    </>
  );
}

/** Amount — dollar first, label secondary. */
function BodyAmount(props) {
  const {
    Icon,
    card,
    active,
    displayValue,
    showCount,
    count,
    countBadgeStyle,
    tileClassName,
    accentStyle,
    tileBg,
    tileBgClassName,
    iconStyle,
    tileTextClassName,
  } = props;
  return (
    <>
      <span
        className={`absolute inset-x-0 bottom-0 h-[2px] ${tileBg ? "" : tileBgClassName || "bg-primary"}`}
        style={accentStyle}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col gap-1 px-2.5 py-2">
        <span
          className={`block truncate text-lg font-bold leading-none tabular-nums tracking-tight ${
            active ? "text-primary" : "text-title"
          }`}
          title={displayValue}
        >
          {displayValue}
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon ? (
            <Icon
              className={`h-3 w-3 shrink-0 opacity-80 ${iconStyle ? "" : tileTextClassName || "text-primary"}`}
              style={iconStyle}
              aria-hidden
            />
          ) : null}
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-secondary" title={card.label}>
            {card.label}
          </span>
          {showCount ? (
            <CountBadge count={count} countBadgeStyle={countBadgeStyle} tileClassName={tileClassName} />
          ) : null}
        </span>
      </span>
    </>
  );
}

/** Split — content left, tall count panel right. */
function BodySplit(props) {
  const {
    Icon,
    card,
    active,
    displayValue,
    showCount,
    count,
    countBadgeStyle,
    tileClassName,
    tileBg,
    tileBgClassName,
    tileText,
    tileTextClassName,
    iconStyle,
  } = props;
  const panelStyle = tileBg
    ? { backgroundColor: tileBg, color: tileText || undefined }
    : undefined;
  return (
    <span className="flex min-h-[3.5rem] min-w-0">
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-2.5 py-2">
        <span className="flex min-w-0 items-center gap-1.5">
          {Icon ? (
            <Icon
              className={`h-4 w-4 shrink-0 ${iconStyle ? "" : tileTextClassName || "text-primary"}`}
              style={iconStyle}
              aria-hidden
            />
          ) : null}
          <span className="min-w-0 truncate text-sm font-semibold text-title" title={card.label}>
            {card.label}
          </span>
        </span>
        <span
          className={`block truncate text-lg font-bold leading-none tabular-nums ${
            active ? "text-primary" : "text-title"
          }`}
          title={displayValue}
        >
          {displayValue}
        </span>
      </span>
      {showCount ? (
        <span
          className={`flex w-11 shrink-0 flex-col items-center justify-center border-l border-border/70 text-base font-bold tabular-nums ${
            panelStyle ? "" : tileClassName || "bg-primary/10 text-primary"
          }`}
          style={panelStyle}
        >
          {count}
        </span>
      ) : (
        <span
          className={`w-1 shrink-0 ${tileBg ? "" : tileBgClassName || "bg-primary"}`}
          style={tileBg ? { backgroundColor: tileBg } : undefined}
          aria-hidden
        />
      )}
    </span>
  );
}

/** Soft — status-tinted wash, no accent bar. */
function BodySoft(props) {
  const {
    Icon,
    card,
    active,
    displayValue,
    showCount,
    count,
    tileBg,
    tileText,
    tileBgClassName,
    tileTextClassName,
    iconStyle,
  } = props;
  const washStyle = tileBg
    ? {
        backgroundColor: tileBg,
        color: tileText || undefined,
        opacity: undefined,
      }
    : undefined;
  return (
    <span
      className={`flex min-w-0 flex-col gap-1 px-2.5 py-2 ${
        washStyle ? "bg-opacity-100" : tileBgClassName || "bg-primary/8"
      }`}
      style={
        washStyle
          ? {
              backgroundColor: tileBg.includes("rgb")
                ? tileBg.replace(/rgba?\(([^)]+)\)/, (_, inner) => {
                    const parts = inner.split(",").map((p) => p.trim());
                    if (parts.length >= 3) return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0.22)`;
                    return tileBg;
                  })
                : tileBg.length === 7
                  ? `${tileBg}38`
                  : tileBg,
            }
          : undefined
      }
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {Icon ? (
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${iconStyle ? "" : tileTextClassName || "text-primary"}`}
            style={iconStyle}
            aria-hidden
          />
        ) : null}
        <span
          className="min-w-0 flex-1 truncate text-xs font-semibold text-title"
          title={card.label}
          style={tileText ? { color: tileText } : undefined}
        >
          {card.label}
        </span>
        {showCount ? (
          <span
            className="inline-flex h-5 min-w-[1.35rem] shrink-0 items-center justify-center border border-current/20 bg-white/50 px-1.5 text-[11px] font-bold tabular-nums text-title dark:bg-black/20"
          >
            {count}
          </span>
        ) : null}
      </span>
      <span
        className={`block truncate text-base font-bold leading-none tabular-nums ${
          active ? "text-primary" : "text-title"
        }`}
        title={displayValue}
      >
        {displayValue}
      </span>
    </span>
  );
}

/** Ink — type-led, no icon chrome, outlined count. */
function BodyInk(props) {
  const {
    card,
    active,
    displayValue,
    showCount,
    count,
    accentStyle,
    tileBg,
    tileBgClassName,
    tileText,
    tileTextClassName,
  } = props;
  const labelStyle = tileText || tileBg ? { color: tileText || tileBg } : undefined;
  return (
    <span className="flex min-w-0 flex-col gap-0.5 px-2.5 py-2">
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span
          className={`min-w-0 truncate text-[11px] font-bold uppercase tracking-[0.08em] ${
            labelStyle ? "" : tileTextClassName || "text-primary"
          }`}
          title={card.label}
          style={labelStyle}
        >
          {card.label}
        </span>
        {showCount ? (
          <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center border border-border px-1 text-[10px] font-bold tabular-nums text-secondary">
            {count}
          </span>
        ) : null}
      </span>
      <span
        className={`block truncate text-base font-bold leading-tight tabular-nums tracking-tight ${
          active ? "text-primary" : "text-title"
        }`}
        title={displayValue}
      >
        {displayValue}
      </span>
      <span
        className={`mt-0.5 h-px w-8 ${tileBg ? "" : tileBgClassName || "bg-primary"}`}
        style={accentStyle}
        aria-hidden
      />
    </span>
  );
}

const BODY_BY_VARIANT = {
  strip: BodyStrip,
  rail: BodyRail,
  amount: BodyAmount,
  split: BodySplit,
  soft: BodySoft,
  ink: BodyInk,
};

/**
 * Status summary filter card — supports multiple design variants (Simple design picker).
 */
export default function StatusFilterPillButton({
  card,
  active,
  onClick,
  formatAmount,
  readOnly = false,
  amountOnly = false,
  className = "",
  labelOnly = false,
  /** Optional override; default is Split. */
  variant: variantProp,
}) {
  const design = useStatusFilterCardDesign();
  const variant = variantProp || design?.variant || "split";

  const amountText =
    typeof formatAmount === "function" ? formatAmount(card.amount) : String(card.amount ?? "");
  const { tileBg, tileText, tileBgClassName, tileTextClassName, tileClassName } = useTileTokens(card);
  const Icon = typeof card.icon === "function" ? card.icon : null;

  const hasCustomSubtitle = card.subtitle != null && String(card.subtitle).trim() !== "";
  const customSubtitle = hasCustomSubtitle ? String(card.subtitle) : "";
  const showStats = !labelOnly;
  const count = card.count ?? 0;
  const showCount = showStats && !amountOnly && !hasCustomSubtitle;
  const displayValue = hasCustomSubtitle || amountOnly ? (hasCustomSubtitle ? customSubtitle : amountText) : amountText;

  const accentStyle = tileBg ? { backgroundColor: tileBg } : undefined;
  const countBadgeStyle =
    tileBg || tileText
      ? {
          ...(tileBg ? { backgroundColor: tileBg } : {}),
          ...(tileText ? { color: tileText } : {}),
        }
      : undefined;
  const iconColor = iconColorOnCard(tileBg, tileText);
  const iconStyle = iconColor ? { color: iconColor } : undefined;
  const iconWellStyle = tileBg
    ? { backgroundColor: tileBg, color: tileText || undefined }
    : undefined;

  const shellClass = [
    "status-filter-pill group relative inline-flex overflow-hidden border text-left transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out",
    "rounded-none bg-card",
    `status-filter-pill--${variant}`,
    active
      ? "border-primary bg-primary/[0.07] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
      : "border-border/90 hover:border-primary/45 hover:bg-primary/[0.03]",
    labelOnly ? "min-w-0 items-center" : "min-w-[7.5rem] max-w-[12.5rem] flex-col",
    variant === "split" && !labelOnly ? "max-w-[13.5rem]" : "",
    variant === "soft" && !labelOnly && !active ? "!bg-transparent hover:!bg-transparent" : "",
    readOnly ? "" : "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyProps = {
    Icon,
    card,
    active,
    amountText,
    displayValue,
    showCount,
    count,
    countBadgeStyle,
    tileClassName,
    accentStyle,
    tileBg,
    tileBgClassName,
    tileText,
    tileTextClassName,
    iconWellStyle,
    iconStyle,
  };

  const Body = BODY_BY_VARIANT[variant] || BodyStrip;

  const content = labelOnly ? (
    <>
      <span
        className={`absolute inset-y-0 left-0 w-[3px] ${tileBg ? "" : tileBgClassName || "bg-primary/50"}`}
        style={accentStyle}
        aria-hidden
      />
      <LabelOnlyBody
        Icon={Icon}
        card={card}
        iconStyle={iconStyle}
        tileTextClassName={tileTextClassName}
      />
    </>
  ) : (
    <Body {...bodyProps} />
  );

  if (readOnly) {
    return (
      <div className={shellClass} role="group" aria-label={card.label}>
        {content}
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
      {content}
    </button>
  );
}
