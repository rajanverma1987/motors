import DashboardGuard from "@/components/dashboard/dashboard-guard";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import UserDisplayZoom from "@/components/dashboard/user-display-zoom";
import { UserSettingsProvider } from "@/contexts/user-settings-context";

export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <UserSettingsProvider>
        <UserDisplayZoom />
        <DashboardShell>{children}</DashboardShell>
      </UserSettingsProvider>
    </DashboardGuard>
  );
}
