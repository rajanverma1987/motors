import DashboardGuard from "@/components/dashboard/dashboard-guard";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import UserDisplayZoom from "@/components/dashboard/user-display-zoom";
import UserCompactTables from "@/components/dashboard/user-compact-tables";
import { UserSettingsProvider } from "@/contexts/user-settings-context";
import { TrialUpgradeProvider } from "@/contexts/trial-upgrade-context";

export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <UserSettingsProvider>
        <TrialUpgradeProvider>
          <UserDisplayZoom />
          <UserCompactTables />
          <DashboardShell>{children}</DashboardShell>
        </TrialUpgradeProvider>
      </UserSettingsProvider>
    </DashboardGuard>
  );
}
