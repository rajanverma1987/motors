"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RepairFlowNewJobForm from "@/components/dashboard/repair-flow-new-job-form";

export default function RepairFlowNewPageClient() {
  const router = useRouter();

  return (
    <div className="w-full min-w-0 flex-1">
      <Link href="/dashboard/repair-flow" className="text-sm text-secondary hover:text-primary">
        ← Back to repair flow
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-title">New repair job</h1>
      <p className="mt-1 text-sm text-secondary">
        Attach a customer and motor to start a job; open it for inspections and quotes.
      </p>

      <div className="mt-8">
        <RepairFlowNewJobForm
          formId="new-repair-flow-job-page"
          onFlowComplete={(job) => router.push(`/dashboard/repair-flow/${job.id}`)}
          onCancel={() => router.push("/dashboard/repair-flow")}
        />
      </div>
    </div>
  );
}
