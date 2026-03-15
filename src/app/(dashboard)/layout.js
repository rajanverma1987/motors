import DashboardGuard from "@/components/dashboard/dashboard-guard";
import DashboardNav from "@/components/dashboard/dashboard-nav";

export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <div className="min-h-screen bg-bg">
        <DashboardNav />
        {children}
      </div>
    </DashboardGuard>
  );
}
