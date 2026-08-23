import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import IndustryPageForm from "@/components/marketing/industry-page-client";
import IndustryWithFormLayout from "@/components/marketing/industry-with-form-layout";
import IndustryFaqAccordion from "@/components/marketing/industry-faq-accordion";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { INDUSTRY_PAGE_OUTER } from "@/lib/listings-directory-layout";

function ContentCards({ items, titleKey, bodyKey }) {
  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-1">
      {items.map((item) => (
        <div key={item[titleKey]} className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <dt className="text-base font-bold text-title">{item[titleKey]}</dt>
          <dd className="mt-3 text-sm leading-relaxed text-secondary sm:text-[0.9375rem]">{item[bodyKey]}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Shared layout for industry vertical landing pages.
 * @param {{ page: import("@/lib/industry-pages").IndustryPage }} props
 */
export default function IndustryPageView({ page }) {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}/${page.slug}`;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.h1,
    url: pageUrl,
    description: page.metaDescription,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className={`relative z-10 ${INDUSTRY_PAGE_OUTER}`}>
          <Breadcrumbs
            items={[
              { name: "Home", url: "/" },
              { name: `${page.industry} motor repair`, url: `/${page.slug}` },
            ]}
          />
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {page.industry} specialists
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">{page.h1}</h1>
          <h2 className="mt-4 max-w-4xl text-xl font-semibold leading-snug text-title sm:text-2xl">{page.subheading}</h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-secondary sm:text-lg">{page.contextParagraph}</p>
        </div>
      </section>

      <div className={`${INDUSTRY_PAGE_OUTER} py-10 sm:py-12`}>
        <IndustryWithFormLayout sidebar={<IndustryPageForm page={page} />}>
          <section aria-labelledby="motors-heading">
            <h2 id="motors-heading" className="text-xl font-bold text-title sm:text-2xl">
              Common motor types in {page.industry.toLowerCase()}
            </h2>
            <p className="mt-2 text-sm text-secondary">
              Typical motors in {page.industry.toLowerCase()} facilities and what to confirm before you ship or request
              field service.
            </p>
            <ContentCards items={page.commonMotors} titleKey="type" bodyKey="context" />
          </section>

          <section aria-labelledby="requirements-heading" className="mt-12 sm:mt-14">
            <h2 id="requirements-heading" className="text-xl font-bold text-title sm:text-2xl">
              What to look for in a {page.industry.toLowerCase()} motor repair shop
            </h2>
            <p className="mt-2 text-sm text-secondary">
              Requirements that separate shops experienced in your industry from general repair centers.
            </p>
            <ContentCards items={page.shopRequirements} titleKey="requirement" bodyKey="why" />
          </section>

          <section aria-labelledby="failures-heading" className="mt-12 sm:mt-14">
            <h2 id="failures-heading" className="text-xl font-bold text-title sm:text-2xl">
              Common failure modes in {page.industry.toLowerCase()} applications
            </h2>
            <p className="mt-2 text-sm text-secondary">
              Failure patterns maintenance teams see most often — and what to address on reinstallation.
            </p>
            <ContentCards items={page.failureModes} titleKey="mode" bodyKey="cause" />
          </section>

          <IndustryFaqAccordion items={page.faqs} slug={page.slug} industry={page.industry} />

          <section aria-labelledby="related-heading" className="mt-12 border-t border-border pt-10 sm:mt-14">
            <h2 id="related-heading" className="text-xl font-bold text-title sm:text-2xl">
              Related guides
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {page.relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex h-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-primary shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </IndustryWithFormLayout>
      </div>
    </>
  );
}
