import { getPublicSiteUrl } from "@/lib/public-site-url";
import NearMeContent from "./near-me-content";
import { NEAR_ME_PATH } from "./near-me-seo-data";

export default function NearMePage() {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const pageUrl = `${site}${NEAR_ME_PATH}`;

  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Industrial Motor Repair Near Me",
    url: pageUrl,
    description:
      "Industrial and commercial electric motor repair shops near your facility (5+ HP plant work). Not for residential, pool, or spa motors.",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        {
          "@type": "ListItem",
          position: 2,
          name: "Industrial Motor Repair Near Me",
          item: pageUrl,
        },
      ],
    },
  };

  return (
    <>
      <NearMeContent />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
    </>
  );
}
