import Link from "next/link";
import OwnAShopLikeThisModule from "@/components/marketing/OwnAShopLikeThisModule";

/**
 * @param {{
 *   areaLabel: string,
 *   introParagraphs: string[],
 *   howToSteps: { title: string, body: string }[],
 *   buyerChecklist: string[],
 *   faqItems: { question: string, answer: string }[],
 *   guideLinks: { href: string, label: string, hint: string }[],
 *   relatedPages: { slug: string, title: string, label: string }[],
 *   insights: object,
 * }} props
 */
export default function LocationPageBody({
  areaLabel,
  introParagraphs,
  howToSteps,
  buyerChecklist,
  faqItems,
  guideLinks,
  relatedPages,
  insights,
}) {
  return (
    <div className="not-prose mt-14 border-t border-border pt-12">
      <section id="location-page-intro" aria-labelledby="location-intro-heading">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
          Motor repair in {areaLabel}
        </p>
        <h2 id="location-intro-heading" className="mt-3 text-2xl font-bold tracking-tight text-title sm:text-3xl">
          Shops in {areaLabel}
        </h2>
        {introParagraphs.map((p, index) => (
          <p key={index} className="mt-4 max-w-[57.6rem] text-sm leading-relaxed text-secondary sm:text-base">
            {p}
          </p>
        ))}

        {(insights.topIndustries?.length > 0 || insights.topCapabilities?.length > 0) && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {insights.topIndustries?.length > 0 ? (
              <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-title">Common industries listed</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {insights.topIndustries.map(({ label, count }) => (
                    <li
                      key={label}
                      className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-secondary"
                    >
                      {label}
                      <span className="ml-1 text-secondary/70">({count})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {insights.topCapabilities?.length > 0 ? (
              <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-title">Common capabilities listed</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {insights.topCapabilities.map(({ label, count }) => (
                    <li
                      key={label}
                      className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-secondary"
                    >
                      {label}
                      <span className="ml-1 text-secondary/70">({count})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section id="location-page-how-to" className="mt-12" aria-labelledby="location-how-to-heading">
        <h2 id="location-how-to-heading" className="text-2xl font-bold text-title sm:text-3xl">
          How to use this page
        </h2>
        <ol className="mt-6 space-y-5">
          {howToSteps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-title">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-secondary sm:text-base">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-title">Before you contact shops</h3>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-secondary">
            {buyerChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="location-page-faq" className="mt-12" aria-labelledby="location-faq-heading">
        <h2 id="location-faq-heading" className="text-2xl font-bold text-title sm:text-3xl">
          FAQ, finding shops in {areaLabel}
        </h2>
        <dl className="mt-6 space-y-6">
          {faqItems.map((item) => (
            <div key={item.question}>
              <dt className="text-base font-semibold text-title">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-secondary sm:text-base">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12" aria-labelledby="location-guides-heading">
        <h2 id="location-guides-heading" className="text-lg font-semibold text-title">
          Pricing &amp; shop selection (separate guides)
        </h2>
        <p className="mt-2 text-sm text-secondary">
          This page helps you find shops in {areaLabel}. Use these guides for ballpark pricing and vetting, not duplicated
          here.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {guideLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-lg border border-border bg-card/60 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-muted/20"
              >
                <span className="font-medium text-primary">{link.label}</span>
                <span className="mt-1 block text-xs text-secondary">{link.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <OwnAShopLikeThisModule className="mt-12" />

      {relatedPages.length > 0 ? (
        <section className="mt-12" aria-labelledby="related-locations-heading">
          <h2 id="related-locations-heading" className="text-lg font-semibold text-title">
            More locations
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {relatedPages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/motor-repair-shop/${p.slug}`}
                  className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-primary hover:border-primary/40 hover:bg-primary/5"
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
