import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Motor tag",
  description: "Print motor job tag; scan to view and update work orders.",
};

export default function MotorTagPage() {
  return (
    <CrmPlaceholder
      title="Motor tag"
      description="Tag is linked to quote. Print from quote or work order. When scanned, shows all work orders for that quote with current status; technician can move any WO in the pipeline. Updates reflect on job board."
    />
  );
}
