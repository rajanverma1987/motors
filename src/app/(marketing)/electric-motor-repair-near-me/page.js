import Link from "next/link";
import AiQuickAnswer from "@/components/marketing/ai-quick-answer";
import { LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";
import HeroBackground from "@/components/marketing/HeroBackground";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import NearMeContent from "./near-me-content";
import NearMeGuide from "./near-me-guide";
import { NEAR_ME_FAQS, NEAR_ME_PATH } from "./near-me-seo-data";

const TRUST_CHIPS = [
  "33+ states covered",
  "EASA-accredited shops listed",
  "AC · DC · Armature · Stator rewinding",
  "24/7 emergency service available",
];

export default function NearMePage() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${NEAR_ME_PATH}`;
  const dateModified = new Date().toISOString().split("T")[0];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Electric Motor Repair and Rewinding Near Me | How to Find a Shop",
    url: pageUrl,
    datePublished: "2025-01-01",
    dateModified,
    author: {
      "@type": "Organization",
      name: "IQMotorBase",
      url: site,
    },
    publisher: {
      "@type": "Organization",
      name: "IQMotorBase",
      logo: { "@type": "ImageObject", url: `${site}/logo.png` },
    },
    description:
      "How to find a certified electric motor repair and rewinding shop near you. " +
      "Covers what to prepare, how to evaluate shops, EASA accreditation, " +
      "turnaround times, and cost ranges.",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".ai-quick-answer", "h1", "h2"],
    },
  };

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Electric Motor Repair Near Me",
    url: pageUrl,
    description:
      "Directory and guide to finding certified electric motor repair shops near you. Covers AC, DC, servo, high-voltage, rewinding, and emergency repair.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        {
          "@type": "ListItem",
          position: 2,
          name: "Electric Motor Repair Near Me",
          item: pageUrl,
        },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: NEAR_ME_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className={`relative z-10 ${LISTINGS_PAGE_CONTAINER}`}>
          <AiQuickAnswer>
            <p>
              <strong>Quick answer:</strong> To find an electric motor repair or rewinding shop near you, use the
              IQMotorBase directory to browse certified shops by state and city. Most US cities have at least one
              EASA-accredited repair center within a 50-mile radius. Standard motor repair turnaround is 5 to 10 business
              days. Emergency repair is available at many shops within 24 to 72 hours at a 25 to 50% premium. AC motor
              rewinding, DC armature rewinding, servo motor repair, high-voltage rewinding, pump repair, and generator
              rewinding are all available through the IQMotorBase network.
            </p>
          </AiQuickAnswer>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-title sm:mt-4 sm:text-4xl lg:text-5xl">
            Electric motor repair and rewinding near me
          </h1>
          <p className="mt-4 max-w-[50.4rem] text-lg text-secondary">
            Find certified AC, DC, servo, and high-voltage motor repair and rewinding shops in your area. Browse approved
            shops by state, compare capabilities, and submit a repair or rewind request in minutes.
          </p>
          <ul className="mt-6 flex list-none flex-wrap gap-2 p-0">
            {TRUST_CHIPS.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-title sm:text-sm"
              >
                {chip}
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link href="/electric-motor-repair-shops-listings" className="font-semibold text-primary hover:underline">
              Browse repair shops in your state
            </Link>
          </p>
          <NearMeContent />
        </div>
      </section>

      <div className="border-b border-border bg-bg">
        <div className={`${LISTINGS_PAGE_CONTAINER} py-4`}>
          <nav aria-label="Breadcrumb" className="text-[13px] text-secondary">
            <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
              <li className="flex items-center gap-1.5">
                <Link href="/" className="text-secondary hover:text-primary">
                  Home
                </Link>
                <span aria-hidden>›</span>
              </li>
              <li>
                <span aria-current="page">Electric motor repair and rewinding near me</span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <NearMeGuide />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}
