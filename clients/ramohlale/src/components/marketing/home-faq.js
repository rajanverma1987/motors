import { HOME_FAQS } from "@/lib/home-faqs";

export default function HomeFAQ() {
  return (
    <section className="border-t border-border bg-bg py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq-heading" className="text-center text-2xl font-bold tracking-tight text-title sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-secondary">
            Common questions about motor repair shop software, mobile workflows, and repair leads.
          </p>
          <dl className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
            {HOME_FAQS.map((faq) => (
              <div key={faq.question} className="px-5 py-5 sm:px-6">
                <dt className="text-base font-semibold text-title">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-secondary">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
