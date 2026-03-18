import { Suspense } from "react";
import JobBoardClient from "./job-board-client";

export const metadata = {
  title: "Shop floor job board",
  description: "Work orders by status.",
};

export default function JobBoardPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:min-h-[calc(100dvh-5.5rem)]">
      <Suspense fallback={<div className="p-8 text-secondary">Loading…</div>}>
        <JobBoardClient />
      </Suspense>
    </div>
  );
}
