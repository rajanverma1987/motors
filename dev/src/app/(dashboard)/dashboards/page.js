import { Suspense } from "react";
import DashboardsPageClient from "./dashboards-page-client";

export const metadata = {
  title: "Simple view",
};

export default function DashboardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center text-sm text-secondary">
          Loading…
        </div>
      }
    >
      <DashboardsPageClient />
    </Suspense>
  );
}
