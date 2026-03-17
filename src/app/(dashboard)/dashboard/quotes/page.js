import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Quotes",
  description: "Repair estimates and quotes.",
};

export default function QuotesPage() {
  return (
    <CrmPlaceholder
      title="Quotes"
      description="Prepare repair estimates. Send quote link to customer for approval, or mark as approved. Create work orders from approved quote."
    />
  );
}
