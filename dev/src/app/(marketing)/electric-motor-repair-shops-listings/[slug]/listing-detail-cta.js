"use client";

import RepairRequestForm from "@/components/marketing/repair-request-form";

export default function ListingDetailCta({ listing }) {
  return (
    <RepairRequestForm
      mode="shop"
      listing={listing}
      city={listing?.city || ""}
      state={listing?.state || ""}
      layout="sidebar"
      className="w-full max-w-none"
    />
  );
}
