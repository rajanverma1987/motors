import { getPublicSiteUrl } from "@/lib/public-site-url";

export function HomePageJsonLd() {
  const siteUrl = getPublicSiteUrl();

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MotorsWinding.com",
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
    name: "MotorsWinding.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Motor repair job management software with Job Write-Up (pipeline quotes, customer send, attachments, and shop actions on one job record), work orders linked to job numbers, job board, customer and motor registry, formal RFQs and invoicing, quotes tied to shop inventory, parts stock with reservations and low-stock alerts, technician mobile app scanning job QR tags, lead generation network, public Careers job postings, and a public marketplace—with buyer requests managed in the CRM.",
    url: siteUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MotorsWinding.com",
    url: siteUrl,
    logo: `${siteUrl}/og-image.png`,
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
    </>
  );
}
