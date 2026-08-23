/**
 * Emergency page FAQ — all items always expanded.
 * @param {{ items: { question: string; answer: string }[] }} props
 */
export default function EmergencyFaqAccordion({ items }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-12">
      <h2 id="faq-heading" className="text-xl font-bold text-title sm:text-2xl">
        Frequently asked questions
      </h2>
      <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
        {items.map((faq, index) => (
          <div key={faq.question} className="px-5 sm:px-6">
            <dt id={`emergency-faq-${index}-q`} className="pt-5 text-base font-semibold text-title">
              {faq.question}
            </dt>
            <dd
              aria-labelledby={`emergency-faq-${index}-q`}
              className="pb-5 pt-2 text-sm leading-relaxed text-secondary"
            >
              <p>{faq.answer}</p>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
