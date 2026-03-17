import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Accounts receivable",
  description: "Customer payments and outstanding balances.",
};

export default function AccountsReceivablePage() {
  return (
    <CrmPlaceholder
      title="Accounts receivable"
      description="Track customer payments. Record payment, view outstanding balances and invoice history."
    />
  );
}
