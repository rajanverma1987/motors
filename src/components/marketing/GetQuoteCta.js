"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import LeadFormModal from "@/components/lead-form-modal";

/**
 * CTA for customer-facing SEO pages: request quote (opens lead form) + find shops link.
 */
export default function GetQuoteCta({ compact = false }) {
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        size={compact ? "sm" : "lg"}
        onClick={() => setLeadFormOpen(true)}
        className="w-full"
      >
        Request a quote
      </Button>
      <Link
        href="/electric-motor-repair-shops-listings"
        className={`inline-flex w-full min-w-0 max-w-full items-center justify-center whitespace-normal text-center text-pretty rounded-md border-[0.5px] border-border bg-transparent text-text transition-opacity hover:bg-card hover:border-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "px-3 py-1 text-sm" : "px-4 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg"
          }`}
      >
        Browse repair shops
      </Link>
      <LeadFormModal open={leadFormOpen} onClose={() => setLeadFormOpen(false)} listing={null} />
    </>
  );
}
