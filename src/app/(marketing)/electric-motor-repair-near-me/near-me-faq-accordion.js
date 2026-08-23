/**
 * Near-me guide FAQ — all items always expanded.
 * @param {{ items: { question: string; answer: string }[] }} props
 */
export default function NearMeFaqAccordion({ items }) {
  return (
    <dl className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((faq, index) => (
        <div key={faq.question} className="px-5 sm:px-6">
          <dt id={`near-me-faq-${index}-q`} className="pt-5 text-base font-semibold text-title">
            {faq.question}
          </dt>
          <dd
            aria-labelledby={`near-me-faq-${index}-q`}
            className="pb-5 pt-2 text-sm leading-relaxed text-secondary"
          >
            <p>{faq.answer}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
