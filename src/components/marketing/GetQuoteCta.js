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
        className={compact ? "w-full" : ""}
      >
        Request a quote
      </Button>
      <Link
        href="/electric-motor-reapir-shops-listings"
        className={`inline-flex w-full items-center justify-center rounded-md border-[0.5px] border-border bg-transparent text-text transition-opacity hover:bg-card hover:border-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          compact ? "px-3 py-1 text-sm" : "px-6 py-3 text-lg"
        }`}
      >
        Browse repair centers
      </Link>
      <LeadFormModal open={leadFormOpen} onClose={() => setLeadFormOpen(false)} listing={null} />
    </>
  );
}
