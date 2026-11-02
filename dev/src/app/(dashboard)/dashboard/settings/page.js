import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalPayloadFromCookies, isPortalEmployee } from "@/lib/auth-portal";
import SettingsPageClient from "@/components/dashboard/settings-page-client";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const payload = await getPortalPayloadFromCookies(cookieStore);
  if (isPortalEmployee(payload)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SettingsPageClient />
    </div>
  );
}
