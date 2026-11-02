import ReportsPageClient from "./reports-page-client";

export const metadata = {
  title: "Reports",
  description: "Management reports: leads, quotes, work orders, AR, AP.",
};

export default function ReportsPage() {
  return <ReportsPageClient />;
}
