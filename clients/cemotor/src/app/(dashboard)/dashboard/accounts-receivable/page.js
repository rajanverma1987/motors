import AccountsReceivablePageClient from "./accounts-receivable-page-client";

export const metadata = {
  title: "Accounts receivable",
  description: "Customer payments and outstanding balances.",
};

export default function AccountsReceivablePage() {
  return <AccountsReceivablePageClient />;
}
