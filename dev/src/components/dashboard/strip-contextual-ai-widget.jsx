"use client";

import { useEffect } from "react";
import { scheduleTeardownContextualAiWidgetDom } from "@/lib/contextual-ai-widget-teardown";

/** Ensures marketing chat widget never persists on dashboard (SPA navigation + async widget.js). */
export default function StripContextualAiWidget() {
  useEffect(() => scheduleTeardownContextualAiWidgetDom(), []);
  return null;
}
