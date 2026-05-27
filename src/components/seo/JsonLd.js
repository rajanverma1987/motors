import { getBrandLogoAbsoluteUrl } from "@/lib/brand-logo";
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

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "IQMotorBase",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    description:
      "Shop management software for electric motor repair businesses. Includes work orders, lead generation, inventory, invoicing, and a technician mobile app.",
    url: siteUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Custom pricing — contact for a demo",
    },
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IQMotorBase",
    url: siteUrl,
    logo: getBrandLogoAbsoluteUrl(),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Sales",
      url: `${siteUrl}/contact`,
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
        id="schema-jsonld-software-application"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        id="schema-jsonld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        id="schema-jsonld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
