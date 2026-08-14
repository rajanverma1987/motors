import { getBrandLogoAbsoluteUrl } from "@/lib/brand-logo";
import { getPublicSiteUrl } from "@/lib/public-site-url";

function JsonLd({ id, data }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Sitewide SoftwareApplication + Organization graph (marketing layout). */
export function SoftwareAppSchema() {
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "IQMotorBase",
        url: siteUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        description:
          "Shop management software for electric motor repair businesses. Work orders, lead generation, inventory, invoicing, job board, technician mobile app, and marketplace.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Custom pricing — contact for a demo",
        },
        featureList: [
          "Job Write-Up and work order management",
          "Electric motor repair lead generation",
          "Shop parts inventory with reservations",
          "Invoicing and accounts receivable",
          "Technician mobile app with QR code scanning",
          "Public marketplace for surplus parts",
          "Employee job postings and careers page",
          "Vendor POs and accounts payable",
          "Customer motor history registry",
          "API and CRM integrations",
        ],
      },
      {
        "@type": "Organization",
        name: "IQMotorBase",
        url: siteUrl,
        logo: getBrandLogoAbsoluteUrl(),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "Sales",
          url: `${siteUrl}/contact`,
          availableLanguage: "English",
        },
      },
    ],
  };

  return <JsonLd id="schema-software-organization" data={schema} />;
}

/**
 * @param {{ faqs: { question: string; answer: string }[] }} props
 */
export function FAQSchema({ faqs }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs || []).map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  return <JsonLd id="schema-faq-page" data={schema} />;
}

/**
 * @param {{ name: string; city: string; state: string; description: string; url: string }} props
 */
export function ShopListingSchema({ name, city, state, description, url }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    description,
    url,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: state,
      addressCountry: "US",
    },
  };
  return <JsonLd id="schema-shop-listing" data={schema} />;
}
