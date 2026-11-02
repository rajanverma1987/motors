import { Suspense } from "react";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import ListingsDirectoryHero from "./listings-directory-hero";
import ListingsDirectoryResults from "./listings-directory-results";
import ListingsDirectoryResultsSkeleton from "./listings-directory-results-skeleton";
import { ListingsDirectoryStaticJsonLd } from "./listings-directory-seo-jsonld";
import { LISTINGS_DIRECTORY_PATH } from "./listings-directory-seo-data";

export const metadata = marketingPageMetadata({
  path: LISTINGS_DIRECTORY_PATH,
  title: { absolute: "Industrial Electric Motor Repair Shop Directory | 3PhaseFlow" },
  description:
    "Browse industrial and commercial electric motor repair shops by state (5+ HP plant and facility work). AC rewinding, DC armature work, stator rewinds, and emergency service. Not for residential, pool, or spa motors.",
  ogTitle: "Industrial Motor Repair & Rewinding Shop Directory | 3PhaseFlow",
  ogDescription:
    "Find industrial motor repair and rewinding shops for plant and facility motors. AC, DC, armature, and stator rewinds. Browse by state or submit a qualified requirement.",
  keywords: [
    "industrial electric motor repair",
    "industrial motor repair shops",
    "industrial motor repair near me",
    "industrial motor rewinding",
    "plant motor repair directory",
    "commercial electric motor repair",
    "facility motor repair shop",
    "AC industrial motor repair",
    "motor rewinding shops industrial",
    "emergency industrial motor repair",
  ],
});

/** Hero renders immediately; cards stream after DB reads so navigation feels instant (e.g. “All listings”). */
export default function ListingsPage({ searchParams }) {
  return (
    <>
      <ListingsDirectoryStaticJsonLd />
      <ListingsDirectoryHero />
      <Suspense fallback={<ListingsDirectoryResultsSkeleton />}>
        <ListingsDirectoryResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}
