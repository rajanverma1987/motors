"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import LeadFormModal from "@/components/lead-form-modal";

export default function ListingDetailCta({ listing }) {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        size="lg"
        onClick={() => setContactOpen(true)}
        className="shrink-0"
      >
        Contact / Request quote
      </Button>
      <LeadFormModal open={contactOpen} onClose={() => setContactOpen(false)} listing={listing} />
    </>
  );
}
