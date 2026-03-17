import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Work orders",
  description: "Track repair jobs.",
};

export default function WorkOrdersPage() {
  return (
    <CrmPlaceholder
      title="Work orders"
      description="Track repair jobs. Types: AC, DC, Armature. One quote can have multiple work orders. Use shop-configured status list."
    />
  );
}
