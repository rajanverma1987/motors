"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RepairFlowNewJobForm from "@/components/dashboard/repair-flow-new-job-form";

export default function RepairFlowNewPageClient() {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
      <Link href="/dashboard/repair-flow" className="text-sm text-secondary hover:text-primary">
        ← Back to repair flow
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-title">New repair job</h1>
      <p className="mt-1 text-sm text-secondary">
        Link an existing customer and motor. After you create the job, add pre-inspections as needed; they appear in the
        table below. Use <span className="font-medium text-title">Open job</span> when you want the full job page.
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
