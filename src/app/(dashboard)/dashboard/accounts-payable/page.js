import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Accounts payable",
  description: "Vendor payments and payables.",
};

export default function AccountsPayablePage() {
  return (
    <CrmPlaceholder
      title="Accounts payable"
      description="Track vendor payments. View payables from purchase orders, record payments, and manage outstanding balances."
    />
  );
}
