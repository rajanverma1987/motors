import { Suspense } from "react";
import SettingsPageClient from "./settings-page-client";

export default function DashboardsSettingsPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-6">
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
