import { Suspense } from "react";
import ListingsDirectoryHero from "./listings-directory-hero";
import ListingsDirectoryResults from "./listings-directory-results";
import ListingsDirectoryResultsSkeleton from "./listings-directory-results-skeleton";
import { ListingsDirectoryStaticJsonLd } from "./listings-directory-seo-jsonld";

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
