import { Suspense } from "react";
import PurchaseOrderFormPageClient from "../purchase-order-form-page-client";

export const metadata = {
  title: "New purchase order",
};

export default function NewPurchaseOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center text-sm text-secondary">
          Loading…
        </div>
      }
    >
      <PurchaseOrderFormPageClient recordId="" />
    </Suspense>
  );
}
