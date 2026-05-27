"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/contexts/user-settings-context";
import { applyDashboardZoom, clearDashboardZoom } from "@/lib/apply-dashboard-zoom";

/**
 * Applies per-account display zoom on the dashboard (html --app-zoom-factor + zoom when supported).
 */
export default function UserDisplayZoom() {
  const { settings, loading } = useUserSettings();

  useEffect(() => {
    if (loading) return;
    applyDashboardZoom(settings?.zoomLevel);
  }, [settings?.zoomLevel, loading]);

  useEffect(() => () => clearDashboardZoom(), []);

  return null;
}
