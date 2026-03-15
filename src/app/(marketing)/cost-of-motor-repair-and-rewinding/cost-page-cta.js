"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import LeadFormModal from "@/components/lead-form-modal";

export default function CostPageCta({ compact = false }) {
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        size={compact ? "sm" : "lg"}
        onClick={() => setLeadFormOpen(true)}
        className={compact ? "!text-xs w-full" : ""}
      >
        {compact ? "Request quote" : "Contact / Request quote"}
      </Button>
      <LeadFormModal open={leadFormOpen} onClose={() => setLeadFormOpen(false)} listing={null} />
    </>
  );
}
