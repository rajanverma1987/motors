"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import Tabs from "@/components/ui/tabs";
import Button from "@/components/ui/button";
import DashboardRfqListPage from "../rfq/rfq-list-page";
import WorkOrdersPageClient from "../work-orders/work-orders-page-client";
import InvoicesPageClient from "../invoices/invoices-page-client";
import {
  ALL_JOBS_TAB_IDS,
  ALL_JOBS_TAB_INVOICES,
  ALL_JOBS_TAB_RFQ,
  ALL_JOBS_TAB_WORK_ORDERS,
} from "@/lib/all-jobs-tabs";

export default function AllJobsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rfqActionsRef = useRef(null);
  const tabParam = searchParams.get("tab");
  const activeTab = ALL_JOBS_TAB_IDS.includes(tabParam) ? tabParam : ALL_JOBS_TAB_RFQ;

  const handleTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTab) return;
      const params = new URLSearchParams();
      params.set("tab", nextTab);
      router.replace(`/dashboard/all-jobs?${params.toString()}`, { scroll: false });
    },
    [activeTab, router]
  );

  const tabs = useMemo(
    () => [
      {
        id: ALL_JOBS_TAB_RFQ,
        label: "RFQ",
        children: <DashboardRfqListPage embedded actionsRef={rfqActionsRef} />,
      },
      {
        id: ALL_JOBS_TAB_WORK_ORDERS,
        label: "Work orders",
        children: <WorkOrdersPageClient embedded />,
      },
      {
        id: ALL_JOBS_TAB_INVOICES,
        label: "Invoices",
        children: <InvoicesPageClient embedded />,
      },
    ],
    []
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-title">All jobs</h1>
            <p className="mt-1 text-sm text-secondary">
              RFQ, work orders, and invoices in one place.
            </p>
          </div>
          {activeTab === ALL_JOBS_TAB_RFQ ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="shrink-0"
              onClick={() => rfqActionsRef.current?.openCreateRfqModal?.()}
            >
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              Create RFQ
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        listClassName="shrink-0"
        panelClassName="flex min-h-0 flex-1 flex-col overflow-hidden pt-4"
        value={activeTab}
        onChange={handleTabChange}
        tabs={tabs}
      />
    </div>
  );
}
