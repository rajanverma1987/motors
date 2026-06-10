import { Suspense } from "react";
import AllJobsPageClient from "./all-jobs-page-client";

export const metadata = {
  title: "All jobs",
  description: "RFQ, work orders, and invoices in one place.",
};

export default function AllJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-secondary">Loading…</div>}>
      <AllJobsPageClient />
    </Suspense>
  );
}
