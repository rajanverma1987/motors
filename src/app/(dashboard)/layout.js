import DashboardGuard from "@/components/dashboard/dashboard-guard";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import ListingUpgradeBanner from "@/components/dashboard/listing-upgrade-banner";
import { UserSettingsProvider } from "@/contexts/user-settings-context";

export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <UserSettingsProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <header className="shrink-0">
          <DashboardNav />
          <ListingUpgradeBanner />
        </header>
        <div className="flex min-h-0 flex-1">
          <DashboardSidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
              {children}
            </div>
          </main>
        </div>
      </div>
      </UserSettingsProvider>
    </DashboardGuard>
  );
}
