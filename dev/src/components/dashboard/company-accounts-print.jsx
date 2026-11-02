"use client";

/**
 * Quote & invoice print: company block from Settings billing (no “Billing” title) + payment terms only.
 */
export default function CompanyAccountsPrint({
  billingAddress = "",
  paymentTermsLabel = "",
  bodyClassName = "text-sm text-title whitespace-pre-wrap",
  termsLabelClassName = "text-secondary",
  termsValueClassName = "font-medium text-title",
  className = "",
}) {
  const bill = String(billingAddress ?? "").trim();
  const terms = String(paymentTermsLabel ?? "").trim() || "NET 30";
  return (
    <div className={className}>
      {bill ? <p className={bodyClassName}>{bill}</p> : null}
      <p className={`text-sm ${bill ? "mt-3" : ""}`}>
        <span className={termsLabelClassName}>Payment terms: </span>
        <span className={termsValueClassName}>{terms}</span>
      </p>
    </div>
  );
}
