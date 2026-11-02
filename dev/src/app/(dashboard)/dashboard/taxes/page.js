import TaxesPageClient from "./taxes-page-client";

export const metadata = {
  title: "Taxes",
  description: "Tax on vendor PO payments and other tax remittances.",
};

export default function TaxesPage() {
  return <TaxesPageClient />;
}
