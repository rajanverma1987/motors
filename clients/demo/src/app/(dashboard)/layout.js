import DashboardGuard from "@/components/dashboard/dashboard-guard";
import DashboardShell from "@/components/dashboard/dashboard-shell";
import UserDisplayZoom from "@/components/dashboard/user-display-zoom";
import UserCompactTables from "@/components/dashboard/user-compact-tables";
import SubscriptionEntitlementGate from "@/components/subscription-entitlement-gate";
import { UserSettingsProvider } from "@/contexts/user-settings-context";
import { TrialUpgradeProvider } from "@/contexts/trial-upgrade-context";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <UserSettingsProvider>
        <TrialUpgradeProvider>
          <SubscriptionEntitlementGate>
            <UserDisplayZoom />
            <UserCompactTables />
            <DashboardShell>{children}</DashboardShell>
          </SubscriptionEntitlementGate>
        </TrialUpgradeProvider>
      </UserSettingsProvider>
    </DashboardGuard>
  );
}
