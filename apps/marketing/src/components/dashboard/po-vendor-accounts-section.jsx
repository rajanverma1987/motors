"use client";

/**
 * PO vendor view/print: Billing + Shipping (labeled), from Settings → Accounts.
 */
export default function PoVendorAccountsSection({
  billingAddress = "",
  shippingAddress = "",
  headingClassName = "text-xs font-semibold uppercase tracking-wide text-secondary mb-1",
  bodyClassName = "text-sm text-title whitespace-pre-wrap",
  className = "",
}) {
  const bill = String(billingAddress ?? "").trim();
  const ship = String(shippingAddress ?? "").trim();
  if (!bill && !ship) return null;
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {bill && (
        <section>
          <h3 className={headingClassName}>Billing</h3>
          <p className={bodyClassName}>{bill}</p>
        </section>
      )}
      {ship && (
        <section>
          <h3 className={headingClassName}>Shipping</h3>
          <p className={bodyClassName}>{ship}</p>
        </section>
      )}
    </div>
  );
}
