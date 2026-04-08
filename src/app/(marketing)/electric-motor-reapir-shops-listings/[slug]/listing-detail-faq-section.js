/**
 * Visible FAQ — questions/answers must match FAQPage JSON-LD on the same page.
 * @param {{ items: { question: string, answer: string }[] }} props
 */
export default function ListingDetailFaqSection({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="mt-10 border-t border-border pt-10" aria-labelledby="listing-faq-heading">
      <h2 id="listing-faq-heading" className="text-xl font-bold tracking-tight text-title sm:text-2xl">
        Frequently asked questions
      </h2>
      <p className="mt-2 max-w-3xl text-sm text-secondary">
        Common questions about this electric motor repair listing and how to use the MotorsWinding directory.
      </p>
      <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((item, i) => (
          <details key={i} className="group px-4 py-3 sm:px-5 sm:py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-medium text-title marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">{item.question}</span>
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-3 max-w-3xl text-sm leading-relaxed text-secondary whitespace-pre-line">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
