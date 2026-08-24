"use client";

import RepairRequestForm from "@/components/marketing/repair-request-form";
import { LISTINGS_FORM_STICKY } from "@/lib/listings-directory-layout";

export default function ListingsRepairFormSidebar({
  mode = "city",
  city = "",
  state = "",
  zipCode = "",
  listing = null,
}) {
  return (
    <aside className={LISTINGS_FORM_STICKY}>
      <RepairRequestForm
        mode={mode}
        city={city}
        state={state}
        zipCode={zipCode}
        listing={listing}
        layout="sidebar"
        className="mx-auto w-full max-w-none"
      />
    </aside>
  );
}
