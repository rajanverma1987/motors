import MarketplacePageClient from "./marketplace-page-client";

export const metadata = {
  title: "Marketplace",
  description: "List parts and equipment for sale on the public marketplace.",
};

export default function MarketplacePage() {
  return <MarketplacePageClient />;
}
