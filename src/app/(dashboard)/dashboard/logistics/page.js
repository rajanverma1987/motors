import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Logistics",
  description: "Receiving and shipping.",
};

export default function LogisticsPage() {
  return (
    <CrmPlaceholder
      title="Logistics"
      description="Receiving: customer motors, vendor parts. Shipping: motors to customer, parts. Link to work order or purchase order. History on WO/PO."
    />
  );
}
