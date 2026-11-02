"use client";

import { useSearchParams, useRouter } from "next/navigation";
import QuotePrintPreview from "@/components/dashboard/quote-print-preview";

/** Optional direct URL; primary print flow is in-page from the Quotes list / modal. */
export default function QuotePrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";

  return (
    <QuotePrintPreview quoteId={id} open={false} standalone onClose={() => router.back()} />
  );
}
