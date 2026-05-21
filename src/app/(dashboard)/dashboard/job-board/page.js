import { Suspense } from "react";
import JobBoardClient from "./job-board-client";

export const metadata = {
  title: "Shop floor job board",
  description: "Work orders by status.",
};

export default function JobBoardPage() {
  return (
    <div className="w-full min-w-0">
      <Suspense fallback={<div className="p-8 text-secondary">Loading…</div>}>
        <JobBoardClient />
      </Suspense>
    </div>
  );
}
