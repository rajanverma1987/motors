import LogisticsPageClient from "./logistics-page-client";

export const metadata = {
  title: "Logistics",
  description: "Receiving and shipping motors; vendor PO receiving.",
};

export default function LogisticsPage() {
  return <LogisticsPageClient />;
}
