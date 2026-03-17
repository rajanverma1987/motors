import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Purchase orders",
  description: "Purchase orders and vendor invoices.",
};

export default function PurchaseOrdersPage() {
  return (
    <CrmPlaceholder
      title="Purchase orders"
      description="Create PO to vendor. Attach vendor invoices, record payments. Track PO status: Open, Partially Invoiced, Fully Paid, etc."
    />
  );
}
