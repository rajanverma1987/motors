import { Suspense } from "react";
import WorkOrdersPageClient from "./work-orders-page-client";

export const metadata = {
  title: "Work orders",
  description: "AC/DC work orders from quotes; sync to motor assets.",
};

export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-secondary">Loading…</div>}>
      <WorkOrdersPageClient />
    </Suspense>
  );
}
