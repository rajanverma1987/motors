"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import LeadFormModal from "@/components/lead-form-modal";

export default function ListingsHeroCta() {
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          variant="primary"
          size="lg"
          className="w-full min-w-0 sm:w-auto"
          onClick={() => setLeadFormOpen(true)}
        >
          Submit your requirement / Request quote
        </Button>
      </div>
      <LeadFormModal open={leadFormOpen} onClose={() => setLeadFormOpen(false)} listing={null} />
    </>
  );
}
