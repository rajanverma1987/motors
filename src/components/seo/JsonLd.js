import { getPublicSiteUrl } from "@/lib/public-site-url";
import { BRAND_LOGO_PUBLIC_PATH } from "@/lib/brand-logo";
import { HOME_FAQS } from "@/lib/home-faqs";
import {
  HERO_DASHBOARD_TABLET_ALT,
  HERO_DASHBOARD_TABLET_HEIGHT,
  HERO_DASHBOARD_TABLET_PATH,
  HERO_DASHBOARD_TABLET_WIDTH,
} from "@/lib/hero-dashboard-seo";

export function HomePageJsonLd() {
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const heroUrl = `${siteUrl}${HERO_DASHBOARD_TABLET_PATH}`;

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

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/#webpage`,
    url: siteUrl,
    name: "Motor Repair Shop Software | Proposals, Work Orders, Invoices & Inventory in One Place | IQMotorBase",
    description:
      "Manage work orders, leads, inventory, invoicing, and QuickBooks Online sync for your electric motor repair shop, all in one platform.",
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: siteUrl },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: heroUrl,
      contentUrl: heroUrl,
      width: HERO_DASHBOARD_TABLET_WIDTH,
      height: HERO_DASHBOARD_TABLET_HEIGHT,
      caption: HERO_DASHBOARD_TABLET_ALT,
      description: HERO_DASHBOARD_TABLET_ALT,
    },
    inLanguage: "en-US",
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

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "SoftwareApplication"],
    name: "IQMotorBase",
    alternateName: "IQ Motor Base",
    url: siteUrl,
    logo: `${siteUrl}${BRAND_LOGO_PUBLIC_PATH}`,
    foundingDate: "2025",
    description:
      "IQMotorBase is a shop management platform and lead generation directory " +
      "built exclusively for electric motor repair and rewinding businesses. " +
      "The platform includes digital job write-ups with motor nameplate data, " +
      "work order management, customer and motor history registry, shop inventory, " +
      "invoicing, accounts receivable, vendor purchase orders, QuickBooks Online sync, " +
      "and a public directory of certified motor repair shops across the United States. " +
      "Pricing starts at $349 per month for unlimited users.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "349.00",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "349.00",
        priceCurrency: "USD",
        unitCode: "MON",
      },
    },
    knowsAbout: [
      "Electric motor repair",
      "Motor rewinding",
      "AC motor rewinding",
      "DC motor armature rewinding",
      "High-voltage motor repair",
      "Servo motor repair",
      "Motor repair shop management software",
      "EASA AR100 rewind standards",
      "NEMA motor standards",
      "Motor repair cost estimation",
    ],
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Sales",
      url: `${siteUrl}/contact`,
      availableLanguage: "English",
    },
    sameAs: [],
  };

  return (
    <>
      <script
        id="schema-jsonld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        id="schema-jsonld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
      <script
        id="schema-jsonld-webpage"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        id="schema-jsonld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
