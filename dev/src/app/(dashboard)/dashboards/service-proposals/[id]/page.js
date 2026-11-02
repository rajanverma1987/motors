import { Suspense } from "react";
import ServiceProposalFormPageClient from "../service-proposal-form-page-client";

export const metadata = {
  title: "Service proposal",
};

export default async function ServiceProposalFormPage({ params }) {
  const resolved = await params;
  const recordId = String(resolved?.id || "").trim();

  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center text-sm text-secondary">
          Loading…
        </div>
      }
    >
      <ServiceProposalFormPageClient recordId={recordId} />
    </Suspense>
  );
}
