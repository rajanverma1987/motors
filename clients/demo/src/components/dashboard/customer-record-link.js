"use client";

export const CUSTOMER_RECORD_LINK_CLASS =
  "text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded";

/**
 * Clickable customer/company name for table cells — opens customer view modal via onOpen(customerId).
 */
export function CustomerRecordLink({
  customerId,
  children,
  onOpen,
  className = CUSTOMER_RECORD_LINK_CLASS,
  title = "Open customer",
}) {
  const id = String(customerId || "").trim();
  const label = children ?? "—";
  if (!id || label === "—") {
    return <span className="text-title">{label}</span>;
  }
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(id);
      }}
      title={title}
    >
      {label}
    </button>
  );
}
