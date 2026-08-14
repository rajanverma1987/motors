import { getPublicSiteUrl } from "@/lib/public-site-url";
import { HOME_FAQS } from "@/lib/home-faqs";

export function HomePageJsonLd() {
  const siteUrl = getPublicSiteUrl();

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "IQMotorBase.com",
    url: siteUrl,
    description:
      "Motor repair center software with Job Write-Up (intake through quote approval on one job number), shop parts inventory and reservations, lead generation, public Careers job postings for hiring technicians, and a public marketplace for surplus parts and equipment. Work orders, repair leads, and SEO-friendly listings for motor repair and rewinding businesses.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/contact?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        id="schema-jsonld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
      <script
        id="schema-jsonld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
