import { Suspense } from "react";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import ListingsDirectoryHero from "./listings-directory-hero";
import ListingsDirectoryResults from "./listings-directory-results";
import ListingsDirectoryResultsSkeleton from "./listings-directory-results-skeleton";
import { ListingsDirectoryStaticJsonLd } from "./listings-directory-seo-jsonld";
import { LISTINGS_DIRECTORY_PATH } from "./listings-directory-seo-data";

export const metadata = marketingPageMetadata({
  path: LISTINGS_DIRECTORY_PATH,
  title: "Find Electric Motor Repair Shops | IQMotorBase Directory",
  description:
    "Browse approved electric motor repair shops by location. Submit your requirement and get matched with repair shops in your area.",
  keywords: [
    "electric motor repair",
    "electric motor repair shops",
    "electric motor repair near me",
    "industrial electric motor repair",
    "motor repair center",
    "electric motor rewinding",
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
