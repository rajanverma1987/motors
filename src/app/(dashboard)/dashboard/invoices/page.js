import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Invoices",
  description: "Invoices from quotes and work orders.",
};

export default function InvoicesPage() {
  return (
    <CrmPlaceholder
      title="Invoices"
      description="Create invoice from quote detail by selecting completed work orders. Add line items, generate, email to customer."
    />
  );
}
