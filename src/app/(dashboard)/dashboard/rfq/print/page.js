"use client";

import { useSearchParams, useRouter } from "next/navigation";
import QuotePrintPreview from "@/components/dashboard/quote-print-preview";

/** Optional direct URL; primary print flow is in-page from the RFQ list / modal. */
export default function RfqQuotePrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  return (
    <QuotePrintPreview quoteId={id} open={false} standalone onClose={() => router.back()} />
  );
};
