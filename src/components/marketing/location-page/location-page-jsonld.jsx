import { getListingPublicPathSegment } from "@/lib/listing-slug";
import { getPublicSiteUrl } from "@/lib/public-site-url";

function JsonLdScript({ id, data }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * @param {{
 *   pageUrl: string,
 *   page: object,
 *   areaLabel: string,
 *   faqItems: { question: string, answer: string }[],
 *   listings: object[],
 * }} props
 */
export default function LocationPageJsonLd({ pageUrl, page, areaLabel, faqItems, listings }) {
  const site = getPublicSiteUrl().replace(/\/$/, "");

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site },
      {
        "@type": "ListItem",
        position: 2,
        name: "Electric motor repair directory",
        item: `${site}/electric-motor-repair-shops-listings`,
      },
      { "@type": "ListItem", position: 3, name: page.title || areaLabel, item: pageUrl },
    ],
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: page.title || `Motor repair shops in ${areaLabel}`,
    description:
      page.metaDescription ||
      `Find motor repair and rewinding shops in ${areaLabel}. Compare capabilities and request quotes.`,
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
    about: { "@type": "Thing", name: `Electric motor repair in ${areaLabel}` },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: page.title || `Motor repair shops in ${areaLabel}`,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 20).map((listing, index) => {
      const slug = getListingPublicPathSegment(listing);
      return {
        "@type": "ListItem",
        position: index + 1,
        name: listing.companyName || "Repair center",
        url: `${site}/electric-motor-repair-shops-listings/${slug}`,
      };
    }),
  };

  return (
    <>
      <JsonLdScript id="schema-breadcrumb-location-page" data={breadcrumb} />
      <JsonLdScript id="schema-webpage-location-page" data={webPage} />
      <JsonLdScript id="schema-faq-location-page" data={faqPage} />
      {listings.length > 0 ? <JsonLdScript id="schema-itemlist-location-page" data={itemList} /> : null}
    </>
  );
}
