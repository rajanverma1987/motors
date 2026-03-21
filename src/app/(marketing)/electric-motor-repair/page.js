import Link from "next/link";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";
import HeroBackground from "@/components/marketing/HeroBackground";
import GetQuoteCta from "@/components/marketing/GetQuoteCta";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/electric-motor-repair";

export const metadata = {
  title: "Electric Motor Repair & Rewinding — Buyer Resource Hub",
  description:
    "Hub for electric motor repair and rewinding: compare costs, choose a shop, repair vs. replace, service types, emergencies, directory, and quote requests—all in one place on MotorsWinding.com.",
  keywords: [
    "electric motor repair",
    "motor rewinding",
    "motor repair directory",
    "industrial motor repair",
    "motor repair quote",
    "electric motor repair near me",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "Electric Motor Repair & Rewinding Hub | MotorsWinding.com",
    description: "Buyer guides: costs, choosing a shop, repair vs. replace, emergencies, and find repair centers.",
    url: path,
    type: "website",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Electric Motor Repair Hub | MotorsWinding.com",
    description: "Costs, shop selection, repair vs. replace, and directory links for motor repair buyers.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function ElectricMotorRepairHubPage() {
  const siteUrl = getPublicSiteUrl();
  const hubJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Electric motor repair & rewinding — buyer resources",
    description:
      "Collection of practical guides for facilities and buyers who need electric motor repair, rewinding, quotes, and qualified shops.",
    url: `${siteUrl.replace(/\/$/, "")}${path}`,
    isPartOf: { "@type": "WebSite", name: "MotorsWinding.com", url: siteUrl.replace(/\/$/, "") },
  };

  return (
    <>
      <script
        id="schema-collection-electric-motor-repair"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hubJsonLd) }}
      />
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-secondary hover:text-primary"
          >
            ← Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
            Electric motor repair &amp; rewinding
          </h1>
          <p className="mt-4 text-lg text-secondary">
            MotorsWinding.com connects buyers with motor repair and rewinding shops and publishes{" "}
            <strong className="text-title">buyer-focused guides</strong> so you can budget, compare quotes, and act
            quickly when equipment fails. Use this hub as your starting point—search engines favor clear structure and
            helpful internal links; we group everything you need below.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[13fr_7fr]">
          <div className="min-w-0 space-y-10">
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-bold text-title">Start here</h2>
              <ul className="mt-4 space-y-3 text-secondary">
                <li>
                  <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
                    Motor repair &amp; rewinding cost guide
                  </Link>
                  <span> — what drives price and typical US ranges</span>
                </li>
                <li>
                  <Link
                    href="/how-to-choose-electric-motor-repair-shop"
                    className="font-medium text-primary hover:underline"
                  >
                    How to choose a repair shop
                  </Link>
                  <span> — scope, testing, certifications, turnaround</span>
                </li>
                <li>
                  <Link
                    href="/when-to-repair-or-replace-electric-motor"
                    className="font-medium text-primary hover:underline"
                  >
                    Repair vs. replace
                  </Link>
                  <span> — decide with real quotes and downtime in mind</span>
                </li>
                <li>
                  <Link href="/types-of-electric-motor-repair-services" className="font-medium text-primary hover:underline">
                    Types of repair services
                  </Link>
                  <span> — rewind vs. repair, AC/DC, testing</span>
                </li>
                <li>
                  <Link href="/emergency-motor-repair-what-to-do" className="font-medium text-primary hover:underline">
                    Emergency motor failure
                  </Link>
                  <span> — rush timelines and documentation</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-title">Find shops &amp; parts</h2>
              <p className="mt-3 text-secondary">
                Our{" "}
                <Link href="/electric-motor-reapir-shops-listings" className="font-medium text-primary hover:underline">
                  repair center directory
                </Link>{" "}
                and{" "}
                <Link href="/electric-motor-reapir-near-me" className="font-medium text-primary hover:underline">
                  near-me listings
                </Link>{" "}
                help you reach shops that quote your HP, voltage, and application. For surplus equipment, browse the{" "}
                <Link href="/marketplace" className="font-medium text-primary hover:underline">
                  marketplace
                </Link>
                .
              </p>
              <p className="mt-4 text-secondary">
                Shop owners can{" "}
                <Link href="/list-your-electric-motor-services" className="font-medium text-primary hover:underline">
                  list a repair business
                </Link>
                , use{" "}
                <Link href="/motor-repair-shop-management-software" className="font-medium text-primary hover:underline">
                  shop software
                </Link>
                , and post jobs on{" "}
                <Link href="/careers" className="font-medium text-primary hover:underline">
                  Careers
                </Link>
                .
              </p>
            </section>

            <MarketingRelatedGuides excludeHref={path} />
          </div>

          <aside className="md:sticky md:top-24 md:self-start">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-title">Get a quote</h2>
              <p className="mt-2 text-sm text-secondary">
                Submit motor details—we connect you with repair centers that can inspect and quote.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <GetQuoteCta />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
