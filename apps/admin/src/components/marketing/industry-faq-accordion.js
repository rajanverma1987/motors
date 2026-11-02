/**
 * Industry FAQ, all items expanded for SEO and readability.
 * @param {{ items: { question: string; answer: string }[]; slug: string; industry: string }} props
 */
export default function IndustryFaqAccordion({ items, slug, industry }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-12 sm:mt-14">
      <h2 id="faq-heading" className="text-xl font-bold text-title sm:text-2xl">
        Motor repair questions, {industry.toLowerCase()} applications
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Answers to common buyer questions for {industry.toLowerCase()} motor repair.
      </p>
      <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
        {items.map((faq, index) => (
          <div key={faq.question} className="px-5 sm:px-6">
            <dt id={`industry-faq-${slug}-${index}-q`} className="pt-5 text-base font-semibold text-title">
              {faq.question}
            </dt>
            <dd
              aria-labelledby={`industry-faq-${slug}-${index}-q`}
              className="pb-5 pt-2 text-sm leading-relaxed text-secondary sm:text-[0.9375rem]"
            >
              <p>{faq.answer}</p>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
