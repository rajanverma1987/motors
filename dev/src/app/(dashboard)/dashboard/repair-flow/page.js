import { redirect } from "next/navigation";

/** Job Write-Up was removed; inspections and jobs live under Work orders and RFQ. */
export default function RepairFlowPage() {
  redirect("/dashboard/work-orders");
}
