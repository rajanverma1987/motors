"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/contexts/user-settings-context";
import {
  applyDashboardDisplay,
  clearDashboardDisplay,
} from "@/lib/apply-dashboard-zoom";

/**
 * Applies per-account display zoom and font size on the dashboard (html CSS variables).
 */
export default function UserDisplayZoom() {
  const { settings, loading } = useUserSettings();

  useEffect(() => {
    if (loading) return;
    applyDashboardDisplay({
      zoomLevel: settings?.zoomLevel,
      fontSizeLevel: settings?.fontSizeLevel,
    });
  }, [settings?.zoomLevel, settings?.fontSizeLevel, loading]);

  useEffect(() => () => clearDashboardDisplay(), []);

  return null;
}
