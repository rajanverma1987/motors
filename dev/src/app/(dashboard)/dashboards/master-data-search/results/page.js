import { Suspense } from "react";
import MasterDataSearchResultsClient from "./master-data-search-results-client";

export const metadata = {
  title: "Search results",
};

export default function MasterDataSearchResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center text-sm text-secondary">
          Loading…
        </div>
      }
    >
      <MasterDataSearchResultsClient />
    </Suspense>
  );
}
