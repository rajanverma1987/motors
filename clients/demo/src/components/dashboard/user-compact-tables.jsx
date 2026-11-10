"use client";

import { useEffect } from "react";
import { useUserSettings } from "@/contexts/user-settings-context";

/** Applies Settings → Display → Compact table rows on the dashboard (html data attribute for global table CSS). */
export default function UserCompactTables() {
  const { settings, loading } = useUserSettings();

  useEffect(() => {
    if (loading) return;
    if (settings?.compactTables) {
      document.documentElement.dataset.compactTables = "true";
    } else {
      delete document.documentElement.dataset.compactTables;
    }
  }, [settings?.compactTables, loading]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.compactTables;
    },
    []
  );

  return null;
}
