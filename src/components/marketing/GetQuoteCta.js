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
      <Link href="/electric-motor-reapir-shops-listings">
        <Button variant="outline" size={compact ? "sm" : "lg"} className="w-full">
          Browse repair centers
        </Button>
      </Link>
      <LeadFormModal open={leadFormOpen} onClose={() => setLeadFormOpen(false)} listing={null} />
    </>
  );
}
