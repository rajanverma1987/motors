import DashboardGuard from "@/components/dashboard/dashboard-guard";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import { UserSettingsProvider } from "@/contexts/user-settings-context";

export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <UserSettingsProvider>
        <DashboardShell>{children}</DashboardShell>
      </UserSettingsProvider>
    </DashboardGuard>
  );
}
