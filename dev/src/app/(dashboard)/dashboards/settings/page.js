import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalPayloadFromCookies, isPortalEmployee } from "@/lib/auth-portal";
import SettingsPageClient from "./settings-page-client";

export default async function DashboardsSettingsPage() {
  const cookieStore = await cookies();
  const payload = await getPortalPayloadFromCookies(cookieStore);
  if (isPortalEmployee(payload)) {
    redirect("/dashboards");
  }

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
