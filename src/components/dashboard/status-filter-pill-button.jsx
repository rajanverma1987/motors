"use client";

import { FiCheck } from "react-icons/fi";

/** Darken a hex or rgb background for the selected check badge. */
function darkerShade(color, amount = 0.28) {
  const s = String(color || "").trim();
  if (!s) return "";
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
    const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
    const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
    return `rgb(${r}, ${g}, ${b})`;
  }
  const rgb = s.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) {
    const r = Math.round(Number(rgb[1]) * (1 - amount));
    const g = Math.round(Number(rgb[2]) * (1 - amount));
    const b = Math.round(Number(rgb[3]) * (1 - amount));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return s;
}

/**
 * Status summary filter chip (RFQ, Invoices, etc.) with tile colors from Settings.
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
  const checkBadgeStyle = tileBg
    ? {
        backgroundColor: darkerShade(tileBg),
        color: tileStyle.color || "#fff",
      }
    : undefined;
  const subtitle = labelOnly
    ? ""
    : card.subtitle != null && String(card.subtitle).trim() !== ""
      ? String(card.subtitle)
      : amountOnly
        ? amountText
        : `${card.count ?? 0} · ${amountText}`;
  const pillClass = `status-filter-pill job-board-status-pill relative min-w-[5.5rem] rounded-lg border px-3 py-2 text-left transition-all duration-150 ${card.tileAppearance?.className ?? ""} ${
    active
      ? "z-[1] opacity-100 saturate-100 pr-8"
      : "border-border opacity-[0.88] saturate-[0.92] hover:opacity-100 hover:saturate-100 hover:shadow-sm pr-3"
  } ${className}`.trim();
  const pillStyle = card.tileAppearance?.style;

  if (readOnly) {
    return (
      <div
        className={`status-filter-pill job-board-status-pill relative min-w-[5.5rem] rounded-lg border px-3 py-2 pr-3 text-left opacity-100 saturate-100 ${card.tileAppearance?.className ?? ""}`}
        style={pillStyle}
        role="group"
        aria-label={card.label}
      >
        <span className="block whitespace-nowrap text-sm font-semibold leading-snug">{card.label}</span>
        {subtitle ? (
          <span className="mt-1 block whitespace-nowrap text-sm font-semibold leading-snug tabular-nums">
            {subtitle}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={pillClass}
      style={pillStyle}
      aria-pressed={active}
    >
      {active ? (
        <span
          className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full ${
            checkBadgeStyle ? "" : "bg-inherit brightness-[0.62] text-inherit"
          }`}
          style={checkBadgeStyle}
          aria-hidden
        >
          <FiCheck className="h-2.5 w-2.5 shrink-0" strokeWidth={3} />
        </span>
      ) : null}
      <span className="block whitespace-nowrap text-sm font-semibold leading-snug">{card.label}</span>
      {subtitle ? (
        <span
          className={`mt-1 block whitespace-nowrap text-sm font-semibold leading-snug tabular-nums ${
            active ? "opacity-100" : "opacity-95"
          }`}
        >
          {subtitle}
        </span>
      ) : null}
    </button>
  );
}
