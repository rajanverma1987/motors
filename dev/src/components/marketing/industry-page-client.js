"use client";

import RepairRequestForm from "@/components/marketing/repair-request-form";
import { LISTINGS_FORM_STICKY } from "@/lib/listings-directory-layout";

/**
 * Sticky industry repair form for the right sidebar.
 * @param {{ page: import("@/lib/industry-pages").IndustryPage }} props
 */
export default function IndustryPageForm({ page }) {
  return (
    <aside className={LISTINGS_FORM_STICKY}>
      <RepairRequestForm
        mode="city"
        defaultIndustry={page.industryTag}
        formHeading={`Submit a repair request, ${page.industry} specialists matched first`}
        layout="sidebar"
        className="mx-auto w-full max-w-none"
      />
    </aside>
  );
}
