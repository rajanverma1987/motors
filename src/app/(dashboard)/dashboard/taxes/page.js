import TaxesPageClient from "./taxes-page-client";

export const metadata = {
  title: "Taxes",
  description: "Tax collected on invoices, tax on vendor PO payments, and other tax payments.",
};

export default function TaxesPage() {
  return <TaxesPageClient />;
}
