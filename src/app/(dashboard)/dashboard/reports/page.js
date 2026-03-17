import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Reports",
  description: "Management reports.",
};

export default function ReportsPage() {
  return (
    <CrmPlaceholder
      title="Reports"
      description="Weekly/monthly revenue, completed jobs, outstanding invoices, top customers, technician productivity."
    />
  );
}
