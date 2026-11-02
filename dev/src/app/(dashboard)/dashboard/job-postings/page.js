import { Suspense } from "react";
import JobPostingsClient from "./job-postings-client";

export const metadata = {
  title: "Job postings",
  description: "Post open roles and review applications from the careers site.",
};

export default function DashboardJobPostingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-secondary">Loading…</div>}>
      <JobPostingsClient />
    </Suspense>
  );
}
