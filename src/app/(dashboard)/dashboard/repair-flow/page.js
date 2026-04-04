import RepairFlowPageClient from "./repair-flow-page-client";

export const metadata = {
  title: "Job Write-Up",
  description:
    "Job write-up, inspection-driven preliminary and final quotes, approvals, and execution — parallel to legacy quotes and work orders.",
};

export default function RepairFlowPage() {
  return <RepairFlowPageClient />;
}
