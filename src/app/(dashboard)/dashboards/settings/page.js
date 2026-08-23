import { Suspense } from "react";
import SettingsPageClient from "./settings-page-client";

export default function DashboardsSettingsPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16 text-sm text-secondary">Loading settings…</div>
        }
      >
        <SettingsPageClient />
      </Suspense>
    </div>
  );
}
