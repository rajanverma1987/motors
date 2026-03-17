import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Customer portal",
  description: "Customer-facing motor tracking.",
};

export default function CustomerPortalPage() {
  return (
    <CrmPlaceholder
      title="Customer portal"
      description="Customers can view motors in repair, status, history, test reports, invoices. Configure visibility and share links."
    />
  );
}
