"use client";

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

/** Renders payment instructions + thank-you at bottom of invoice (print + customer link). */
export function InvoicePaymentFooterPrint({
  paymentOptions = "",
  thankYouNote = "",
  variant = "dashboard",
  compact = false,
}) {
  const pay = String(paymentOptions ?? "").trim();
  const thanks = String(thankYouNote ?? "").trim();
  if (!pay && !thanks) return null;

  const isCustomer = variant === "customer";
  const border = isCustomer ? "border-gray-200" : "border-neutral-300";
  const label = isCustomer ? "text-gray-500" : "text-neutral-600";
  const body = isCustomer ? "text-gray-900" : "text-neutral-900";
  const thanksClass = isCustomer ? "text-gray-700" : "text-neutral-700";
  const linkClass = "break-all text-primary underline hover:opacity-90";
  const footerPad = compact ? "mt-3 border-t pt-2" : "mt-8 border-t pt-6";
  const payBlock = compact ? "mb-2" : "mb-6";
  const payHeading = compact ? "mb-1 text-[10px]" : "mb-2 text-xs";

  return (
    <footer className={`${footerPad} ${border}`}>
      {pay ? (
        <div className={payBlock}>
          <h2 className={`${payHeading} font-semibold uppercase tracking-wide ${label}`}>
            Payment options
          </h2>
          <PaymentOptionsWithLinks
            text={pay}
            className={`whitespace-pre-wrap ${compact ? "text-xs leading-snug" : "text-sm"} ${body}`}
            linkClassName={linkClass}
          />
        </div>
      ) : null}
      {thanks ? (
        <p className={`text-center ${compact ? "text-xs" : "text-sm"} font-medium italic ${thanksClass}`}>{thanks}</p>
      ) : null}
    </footer>
  );
}

function PaymentOptionsWithLinks({ text, className, linkClassName }) {
  const segments = text.split(URL_RE);
  return (
    <div className={className}>
      {segments.map((seg, i) => {
        if (/^https?:\/\//i.test(seg)) {
          return (
            <a key={i} href={seg} target="_blank" rel="noopener noreferrer" className={linkClassName}>
              {seg}
            </a>
          );
        }
        return <span key={i}>{seg}</span>;
      })}
    </div>
  );
}
