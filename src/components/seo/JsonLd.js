const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://motors.example.com";

export function HomePageJsonLd() {
  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MotorsWinding.com",
    url: siteUrl,
    description:
      "Motor repair center software and lead generation. Center management, work orders, and repair leads for motor repair and rewinding businesses.",
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
      "Motor repair Job management software with work orders, job board, customer and motor registry, quotes, invoicing, and lead generation network for repair centers.",
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
