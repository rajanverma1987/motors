import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import Button from "@/components/ui/button";
import { FiMessageCircle } from "react-icons/fi";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com";

function waHref() {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length >= 10) return `https://wa.me/${digits}`;
  return "/contact";
}

function WaButton() {
  const href = waHref();
  const isWa = href.startsWith("https://wa.me/");
  return (
    <Link href={href} className="block" target={isWa ? "_blank" : undefined} rel={isWa ? "noopener noreferrer" : undefined}>
      <Button variant="outline" size="lg" className="w-full gap-2 border-emerald-600/50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
        <FiMessageCircle className="h-5 w-5" aria-hidden />
        {isWa ? "WhatsApp us" : "Message us (contact)"}
      </Button>
    </Link>
  );
}

/**
 * @param {object} props
 * @param {string} props.h1
 * @param {string} props.canonicalPath
 * @param {{ href: string; label: string }[]} props.breadcrumbs
 * @param {string[]} props.introParagraphs
 * @param {string} props.problemTitle
 * @param {string[]} props.problemParagraphs
 * @param {string} props.solutionTitle
 * @param {string[]} props.solutionParagraphs
 * @param {string[]} [props.benefits] - flat list (used when benefitGroups omitted)
 * @param {{ title: string; items: string[] }[]} [props.benefitGroups] - grouped benefits (e.g. USA hub)
 * @param {{ q: string; a: string }[]} props.faq
 * @param {{ title: string; links: { href: string; label: string }[] }[]} props.linkSections
 * @param {string} [props.formSourcePath]
 * @param {string} [props.defaultCity]
 * @param {string} [props.defaultState]
 * @param {string} [props.localityLabel] - e.g. "Houston, Texas" for schema
 */
export default function SeoLeadLandingPage({
  h1,
  canonicalPath,
  breadcrumbs,
  introParagraphs,
  problemTitle,
  problemParagraphs,
  solutionTitle,
  solutionParagraphs,
  benefits = [],
  benefitGroups,
  faq,
  linkSections,
  formSourcePath,
  defaultCity = "",
  defaultState = "",
  localityLabel = "United States",
}) {
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const absoluteUrl = `${siteUrl.replace(/\/$/, "")}${path}`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MotorsWinding.com",
    url: siteUrl.replace(/\/$/, ""),
    description:
      "Job management, lead generation, and workshop tools for electric motor repair and rewinding businesses in the USA.",
    areaServed: { "@type": "Country", name: "United States" },
  };

  const localBizJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "MotorsWinding.com — Motor repair shop software & leads",
    url: absoluteUrl,
    description: `Get more repair jobs and manage your workshop with MotorsWinding.com. Focus: ${localityLabel}.`,
    priceRange: "Free tier available",
    address: { "@type": "PostalAddress", addressCountry: "US" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBizJsonLd) }} />

      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-sm text-secondary">
            <ol className="flex flex-wrap items-center gap-2">
              {breadcrumbs.map((b, i) => (
                <li key={b.href} className="flex items-center gap-2">
                  {i > 0 && <span className="text-border">/</span>}
                  <Link href={b.href} className="hover:text-primary">
                    {b.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">{h1}</h1>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          <article className="min-w-0 space-y-10 prose prose-neutral dark:prose-invert max-w-none">
            <section>
              {introParagraphs.map((p, i) => (
                <p key={i} className="text-secondary leading-relaxed">
                  {p}
                </p>
              ))}
            </section>

            <section>
              <h2 className="text-2xl font-bold text-title sm:text-3xl">{problemTitle}</h2>
              {problemParagraphs.map((p, i) => (
                <p key={i} className="mt-4 text-secondary leading-relaxed">
                  {p}
                </p>
              ))}
            </section>

            <section>
              <h2 className="text-2xl font-bold text-title sm:text-3xl">{solutionTitle}</h2>
              {solutionParagraphs.map((p, i) => (
                <p key={i} className="mt-4 text-secondary leading-relaxed">
                  {p}
                </p>
              ))}
            </section>

            <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6 sm:p-8">
              <h2 className="text-xl font-bold text-title sm:text-2xl">What you get with MotorsWinding.com</h2>
              <p className="mt-3 text-sm text-secondary leading-relaxed">
                Benefits span the full journey from discovery to payment—so you&apos;re not paying for a directory badge and
                juggling the rest elsewhere.
              </p>
              {benefitGroups && benefitGroups.length > 0 ? (
                <div className="mt-6 space-y-8">
                  {benefitGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-lg font-semibold text-title">{group.title}</h3>
                      <ul className="mt-3 list-none space-y-3 p-0">
                        {group.items.map((line) => (
                          <li key={line} className="flex gap-3 text-secondary">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="mt-4 list-none space-y-3 p-0">
                  {benefits.map((line) => (
                    <li key={line} className="flex gap-3 text-secondary">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-6 text-sm text-secondary">
                We don&apos;t position this as a passive directory—you get a system to{" "}
                <strong className="text-title">win repair jobs and run the workshop</strong> in one place. Explore{" "}
                <Link href="/features" className="text-primary font-medium hover:underline">
                  CRM features
                </Link>
                ,{" "}
                <Link href="/pricing" className="text-primary font-medium hover:underline">
                  pricing
                </Link>
                , or{" "}
                <Link href="/register" className="text-primary font-medium hover:underline">
                  create a free account
                </Link>
                .
              </p>
            </section>

            {linkSections?.length > 0 && (
              <section className="border-t border-border pt-10">
                <h2 className="text-xl font-bold text-title sm:text-2xl">Explore more</h2>
                <div className="mt-6 grid gap-8 sm:grid-cols-2">
                  {linkSections.map((block) => (
                    <div key={block.title}>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">{block.title}</h3>
                      <ul className="mt-3 space-y-2">
                        {block.links.map((l) => (
                          <li key={l.href}>
                            <Link href={l.href} className="text-primary font-medium hover:underline">
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold text-title sm:text-2xl">Frequently asked questions</h2>
              <dl className="mt-6 space-y-6">
                {faq.map((item) => (
                  <div key={item.q}>
                    <dt className="font-semibold text-title">{item.q}</dt>
                    <dd className="mt-2 text-secondary leading-relaxed">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </article>

          <aside className="lg:sticky lg:top-24 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-title">Get more jobs + CRM access</h2>
              <p className="mt-2 text-sm text-secondary">
                Tell us who you are—we&apos;ll help you get listed and onboarded to manage quotes, jobs, and billing.
              </p>
              <div className="mt-5 space-y-3">
                <SeoLeadMiniForm
                  sourcePage={formSourcePath || path}
                  defaultCity={defaultCity}
                  defaultState={defaultState}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-title">Prefer instant chat?</h2>
              <p className="mt-2 text-sm text-secondary">
                Reach out on WhatsApp when configured for your account, or use our contact page for the same team.
              </p>
              <div className="mt-4">
                <WaButton />
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-bg/80 p-5">
              <p className="text-sm font-medium text-title">List your capabilities publicly</p>
              <p className="mt-2 text-sm text-secondary">
                Ready to add your shop to the directory with photos, services, and service area?
              </p>
              <Link href="/list-your-electric-motor-services" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                Start your directory listing →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
