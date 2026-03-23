"use client";

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

/** Renders payment instructions + thank-you at bottom of invoice (print + customer link). */
export function InvoicePaymentFooterPrint({
  paymentOptions = "",
  thankYouNote = "",
  variant = "dashboard",
}) {
  const pay = String(paymentOptions ?? "").trim();
  const thanks = String(thankYouNote ?? "").trim();
  if (!pay && !thanks) return null;

  const isCustomer = variant === "customer";
  const border = isCustomer ? "border-gray-200" : "border-border";
  const label = isCustomer ? "text-gray-500" : "text-secondary";
  const body = isCustomer ? "text-gray-900" : "text-title";
  const thanksClass = isCustomer ? "text-gray-700" : "text-secondary";
  const linkClass = "break-all text-primary underline hover:opacity-90";

  return (
    <footer className={`mt-8 border-t pt-6 ${border}`}>
      {pay ? (
        <div className="mb-6">
          <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${label}`}>
            Payment options
          </h2>
          <PaymentOptionsWithLinks
            text={pay}
            className={`whitespace-pre-wrap text-sm ${body}`}
            linkClassName={linkClass}
          />
        </div>
      ) : null}
      {thanks ? (
        <p className={`text-center text-sm font-medium italic ${thanksClass}`}>{thanks}</p>
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
