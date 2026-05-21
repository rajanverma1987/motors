"use client";

/**
 * Status summary filter chip (RFQ, Invoices, etc.) with tile colors from Settings.
 */
export default function StatusFilterPillButton({ card, active, onClick, formatAmount }) {
  const amountText =
    typeof formatAmount === "function" ? formatAmount(card.amount) : String(card.amount ?? "");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`job-board-status-pill min-w-[5.5rem] rounded-lg border px-3 py-2 text-left transition-all ${card.tileAppearance?.className ?? ""} ${
        active
          ? "z-[1] border-primary/80 shadow-md ring-2 ring-primary/55 ring-offset-1 ring-offset-bg dark:ring-offset-bg"
          : "border-border hover:border-primary/35 hover:shadow-sm hover:brightness-[0.98] dark:hover:brightness-110"
      }`}
      style={card.tileAppearance?.style}
      aria-pressed={active}
    >
      <span className="block whitespace-nowrap text-sm font-semibold leading-snug">{card.label}</span>
      <span className="mt-1 block whitespace-nowrap text-xs font-medium leading-snug tabular-nums opacity-90">
        {card.count} · {amountText}
      </span>
    </button>
  );
}
