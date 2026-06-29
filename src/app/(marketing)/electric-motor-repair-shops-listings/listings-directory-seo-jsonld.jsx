import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import { LISTINGS_DIRECTORY_FAQ_ITEMS, LISTINGS_DIRECTORY_PATH } from "./listings-directory-seo-data";

function JsonLdScript({ id, data }) {
  return (
    <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function ListingsDirectoryStaticJsonLd() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${LISTINGS_DIRECTORY_PATH}`;

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    name: "Electric motor repair shops directory",
    description:
      "Directory of electric motor repair and rewinding centers in the United States. Search by location, compare capabilities, and request quotes.",
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
    about: [
      { "@type": "Thing", name: "Electric motor repair" },
      { "@type": "Thing", name: "Motor rewinding" },
      { "@type": "Thing", name: "Industrial motor repair" },
    ],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#listings-directory-summary", "#electric-motor-repair-directory-guide"],
    },
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: "Electric motor repair shops directory",
    description:
      "Find electric motor repair shops and rewinding centers. Browse listings by city, state, or ZIP code and request quotes from qualified repair centers.",
    isPartOf: { "@type": "WebSite", name: "IQMotorBase.com", url: site },
    primaryImageOfPage: { "@type": "ImageObject", url: `${site}/og-image.png` },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site },
      {
        "@type": "ListItem",
        position: 2,
        name: "Electric motor repair",
        item: `${site}/electric-motor-repair`,
      },
      { "@type": "ListItem", position: 3, name: "Repair shops directory", item: pageUrl },
    ],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LISTINGS_DIRECTORY_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <JsonLdScript id="schema-collection-listings-directory" data={collectionPage} />
      <JsonLdScript id="schema-webpage-listings-directory" data={webPage} />
      <JsonLdScript id="schema-breadcrumb-listings-directory" data={breadcrumb} />
      <JsonLdScript id="schema-faq-listings-directory" data={faqPage} />
    </>
  );
}

/**
 * @param {{ listings: object[], page: number, pageSize: number, total: number }} props
 */
export function ListingsDirectoryItemListJsonLd({ listings, page, pageSize, total }) {
  if (!Array.isArray(listings) || listings.length === 0) return null;

  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${LISTINGS_DIRECTORY_PATH}`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Electric motor repair shops",
    description: "Electric motor repair and rewinding centers listed on IQMotorBase.com",
    numberOfItems: total,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: listings.map((listing, index) => {
      const slug = getListingPublicPathSegment(listing);
      const name = listing.companyName || listing.name || "Electric motor repair center";
      return {
        "@type": "ListItem",
        position: (page - 1) * pageSize + index + 1,
        name,
        url: `${site}${LISTINGS_DIRECTORY_PATH}/${slug}`,
      };
    }),
  };

  return <JsonLdScript id="schema-itemlist-listings-directory" data={itemList} />;
}
