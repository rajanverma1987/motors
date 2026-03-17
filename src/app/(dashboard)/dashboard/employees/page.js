import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Employees",
  description: "Shop employees and technicians.",
};

export default function EmployeesPage() {
  return (
    <CrmPlaceholder
      title="Employees"
      description="Manage technicians and staff. Assign jobs to technicians from work orders. Track workload."
    />
  );
}
