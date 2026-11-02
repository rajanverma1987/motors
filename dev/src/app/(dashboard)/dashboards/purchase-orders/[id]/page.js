import { Suspense } from "react";
import PurchaseOrderFormPageClient from "../purchase-order-form-page-client";

export const metadata = {
  title: "Purchase order",
};

export default async function PurchaseOrderFormPage({ params }) {
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
      <PurchaseOrderFormPageClient recordId={recordId} />
    </Suspense>
  );
}
