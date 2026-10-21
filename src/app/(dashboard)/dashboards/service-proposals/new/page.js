import { Suspense } from "react";
import ServiceProposalFormPageClient from "../service-proposal-form-page-client";

export const metadata = {
  title: "New service proposal",
};

export default function NewServiceProposalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center text-sm text-secondary">
          Loading…
        </div>
      }
    >
      <ServiceProposalFormPageClient recordId="" />
    </Suspense>
  );
}
