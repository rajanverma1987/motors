"use client";

import { useEffect } from "react";

/**
 * Fire-and-forget page view for public listing detail pages.
 * @param {{ listingId: string }} props
 */
export default function ListingPageViewTracker({ listingId }) {
  useEffect(() => {
    if (!listingId) return;
    fetch("/api/listings/public/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
      keepalive: true,
    }).catch(() => {});
  }, [listingId]);

  return null;
}
