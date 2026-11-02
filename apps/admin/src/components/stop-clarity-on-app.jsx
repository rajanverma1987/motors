"use client";

import { useEffect } from "react";
import { stopWebsiteAnalytics } from "@/lib/website-analytics";

/**
 * Ensures GA / Clarity do not keep collecting after the user enters
 * dashboard / admin (scripts may still be in memory from a prior website visit).
 */
export default function StopClarityOnApp() {
  useEffect(() => {
    stopWebsiteAnalytics();
  }, []);

  return null;
}
