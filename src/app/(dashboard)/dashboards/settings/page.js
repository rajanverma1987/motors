import { Suspense } from "react";
import SettingsPageClient from "./settings-page-client";

export default function DashboardsSettingsPage() {
  return (
    <div className="simple-portal simple-settings-page relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center px-4 text-sm text-secondary">
            Loading settings…
          </div>
        }
      >
        <SettingsPageClient />
      </Suspense>
    </div>
  );
}
