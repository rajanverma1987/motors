import { getPublicSiteUrl } from "@/lib/public-site-url";

export function HomePageJsonLd() {
  const siteUrl = getPublicSiteUrl();

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MotorsWinding.com",
    url: siteUrl,
    description:
      "Motor repair center software, shop parts inventory and reservations, lead generation, and a public marketplace for surplus parts and equipment. Center management, work orders, repair leads, and SEO-friendly listings for motor repair and rewinding businesses.",
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
      "Motor repair job management software with work orders, job board, customer and motor registry, quotes tied to shop inventory, parts stock with reservations and low-stock alerts, invoicing, lead generation network, and a public marketplace to list surplus—with buyer requests managed in the CRM.",
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
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSite) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
    </>
  );
}
