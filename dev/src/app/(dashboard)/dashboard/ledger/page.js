import LedgerPageClient from "./ledger-page-client";

export const metadata = {
  title: "Ledger",
  description: "All receivable and payable money movements.",
};

export default function LedgerPage() {
  return <LedgerPageClient />;
}
