"use client";

import { useEffect } from "react";
import { stopClarityCollect } from "@/lib/clarity-website";

/**
 * Ensures Microsoft Clarity does not keep collecting after the user enters
 * dashboard / admin (script may still be in memory from a prior website visit).
 */
export default function StopClarityOnApp() {
  useEffect(() => {
    stopClarityCollect();
  }, []);

  return null;
}
