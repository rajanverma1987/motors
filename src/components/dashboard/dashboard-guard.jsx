"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import Button from "@/components/ui/button";

const PROTECTED_PAGE_COPY = {
  "/dashboard/job-board": {
    title: "Shop-floor job board",
    detail:
      "Live board view of current work orders with lane status tracking, customer context, and progress visibility for office and floor teams.",
  },
  "/dashboard/quotes": {
    title: "Quotes",
    detail:
      "Create and track RFQs, pricing, approvals, and conversion from quote to downstream operations in one workflow.",
  },
  "/dashboard/work-orders": {
    title: "Work orders",
    detail:
      "Plan, assign, and track repair work by stage with technician updates, turnaround visibility, and linked customer jobs.",
  },
  "/dashboard/calculators": {
    title: "Technician calculators",
    detail:
      "Built-in calculation tools for day-to-day shop-floor decisions so technicians can validate values quickly during repair and testing.",
  },
};

export default function DashboardGuard({ children }) {
  const { user, mounted } = useAuth();
  const pathname = usePathname();
  const pageCopy = useMemo(
    () =>
      PROTECTED_PAGE_COPY[pathname] || {
        title: "CRM dashboard",
        detail:
          "Access your business workspace for leads, customers, quotes, work orders, inventory, receivables, payables, and reporting.",
      },
    [pathname]
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Protected Page</p>
          <h1 className="mt-2 text-xl font-semibold text-title">Checking access…</h1>
          <p className="mt-3 text-sm text-secondary">
            This CRM page is available to authenticated users. If you do not have access yet, request a demo and CRM
            onboarding for your repair center.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Protected Page</p>
          <h1 className="mt-2 text-xl font-semibold text-title">{pageCopy.title} requires CRM access.</h1>
          <p className="mt-3 text-sm text-secondary">{pageCopy.detail}</p>
          <p className="mt-2 text-sm text-secondary">
            Sign in to your existing account, or request CRM access to run your full motor repair workflow in one system.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/contact">
              <Button size="sm" variant="primary">Get CRM access</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" variant="outline">Sign in</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
