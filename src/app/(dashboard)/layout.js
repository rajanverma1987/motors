import DashboardGuard from "@/components/dashboard/dashboard-guard";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";

export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <div className="flex h-screen flex-col overflow-hidden bg-bg">
        <header className="shrink-0">
          <DashboardNav />
        </header>
        <div className="flex min-h-0 flex-1">
          <DashboardSidebar />
          <main className="min-h-0 min-w-0 flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardGuard>
  );
}
