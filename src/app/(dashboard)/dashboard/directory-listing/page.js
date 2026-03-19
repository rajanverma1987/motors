import DirectoryListingPageClient from "./directory-listing-page-client";

export const metadata = {
  title: "Directory listing",
  description: "Create or update your repair center profile on the public directory.",
};

export default function DirectoryListingPage() {
  return <DirectoryListingPageClient />;
}
