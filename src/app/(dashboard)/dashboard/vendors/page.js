import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Vendors",
  description: "Suppliers of parts and materials.",
};

export default function VendorsPage() {
  return (
    <CrmPlaceholder
      title="Vendors"
      description="Manage suppliers: name, contact, parts supplied, payment terms. Purchase history links to purchase orders."
    />
  );
}
