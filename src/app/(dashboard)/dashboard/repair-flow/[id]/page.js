import RepairFlowJobDetailClient from "./repair-flow-job-detail-client";

export async function generateMetadata({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params ?? {};
  return {
    title: resolved?.id ? `Repair job` : "Repair job",
    description: "Inspection-driven repair job detail.",
  };
}

export default function RepairFlowJobDetailPage() {
  return <RepairFlowJobDetailClient />;
}
