import InvoicesPageClient from "./invoices-page-client";

export const metadata = {
  title: "Invoices",
  description: "Invoices from quotes and work orders.",
};

export default function InvoicesPage() {
  return <InvoicesPageClient />;
}
