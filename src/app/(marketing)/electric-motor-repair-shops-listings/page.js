import { Suspense } from "react";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import ListingsDirectoryHero from "./listings-directory-hero";
import ListingsDirectoryResults from "./listings-directory-results";
import ListingsDirectoryResultsSkeleton from "./listings-directory-results-skeleton";
import { ListingsDirectoryStaticJsonLd } from "./listings-directory-seo-jsonld";
import { LISTINGS_DIRECTORY_PATH } from "./listings-directory-seo-data";

export const metadata = marketingPageMetadata({
  path: LISTINGS_DIRECTORY_PATH,
  title: { absolute: "Find Electric Motor Repair & Rewinding Shops | IQMotorBase Directory" },
  description:
    "Browse certified electric motor repair and rewinding shops by state. AC motor rewinding, DC armature rewinds, stator rewinding, and emergency service. Submit a repair request, matched to shops in your area.",
  ogTitle: "Electric Motor Repair & Rewinding Shop Directory | IQMotorBase",
  ogDescription:
    "Find certified motor repair and rewinding shops near you. AC, DC, armature, and stator rewinds. Browse by state or submit a requirement.",
  keywords: [
    "electric motor repair",
    "electric motor repair shops",
    "electric motor repair near me",
    "electric motor rewinding",
    "motor rewinding shops",
    "industrial electric motor repair",
    "motor repair center",
    "AC motor repair",
    "motor repair directory",
    "electric motor repair services",
    "commercial electric motor repair",
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
