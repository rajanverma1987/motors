"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Tabs from "@/components/ui/tabs";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import DashboardRfqListPage from "../rfq/rfq-list-page";
import WorkOrdersPageClient from "../work-orders/work-orders-page-client";
import InvoicesPageClient from "../invoices/invoices-page-client";
import {
  ALL_JOBS_TAB_IDS,
  ALL_JOBS_TAB_INVOICES,
  ALL_JOBS_TAB_RFQ,
  ALL_JOBS_TAB_WORK_ORDERS,
} from "@/lib/all-jobs-tabs";
import {
  ALL_JOBS_DATE_FROM_PARAM,
  ALL_JOBS_DATE_TO_PARAM,
  currentAllJobsFinancialYearRange,
  isAllJobsCurrentFinancialYear,
  parseAllJobsDateRange,
} from "@/lib/all-jobs-date-filter";

const DATE_FILTER_PILL_CLASS = "h-9 shrink-0 !flex !items-center !justify-center !py-0 px-3";
const DATE_FILTER_INPUT_CLASS =
  "mb-0 flex min-w-[10.5rem] flex-row items-center gap-1.5 [&_label]:mb-0 [&_label]:shrink-0 [&_label]:text-sm";
const DATE_FILTER_INPUT_FIELD_CLASS = "!h-9 !min-h-9 !py-1";
const DATE_FILTER_BUTTON_CLASS = "h-9 shrink-0 px-3";

export default function AllJobsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = ALL_JOBS_TAB_IDS.includes(tabParam) ? tabParam : ALL_JOBS_TAB_RFQ;
  const fyDefault = useMemo(() => currentAllJobsFinancialYearRange(), []);
  const { from: appliedFrom, to: appliedTo } = parseAllJobsDateRange(searchParams);
  const isAllDates = !appliedFrom && !appliedTo;
  const isCurrentFy = isAllJobsCurrentFinancialYear(appliedFrom, appliedTo);

  const [draftFrom, setDraftFrom] = useState(() => appliedFrom || fyDefault.from);
  const [draftTo, setDraftTo] = useState(() => appliedTo || fyDefault.to);

  useEffect(() => {
    if (isAllDates) {
      setDraftFrom(fyDefault.from);
      setDraftTo(fyDefault.to);
      return;
    }
    setDraftFrom(appliedFrom);
    setDraftTo(appliedTo);
  }, [appliedFrom, appliedTo, isAllDates, fyDefault.from, fyDefault.to]);

  const replaceSearchParams = useCallback(
    (mutate) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.get("tab")) params.set("tab", activeTab);
      mutate(params);
      router.replace(`/dashboard/all-jobs?${params.toString()}`, { scroll: false });
    },
    [activeTab, router, searchParams]
  );

  const applyDateRange = useCallback(
    (from, to) => {
      const nextFrom = String(from || "").trim().slice(0, 10);
      const nextTo = String(to || "").trim().slice(0, 10);
      replaceSearchParams((params) => {
        if (nextFrom) params.set(ALL_JOBS_DATE_FROM_PARAM, nextFrom);
        else params.delete(ALL_JOBS_DATE_FROM_PARAM);
        if (nextTo) params.set(ALL_JOBS_DATE_TO_PARAM, nextTo);
        else params.delete(ALL_JOBS_DATE_TO_PARAM);
      });
    },
    [replaceSearchParams]
  );

  const handleTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTab) return;
      replaceSearchParams((params) => {
        params.set("tab", nextTab);
      });
    },
    [activeTab, replaceSearchParams]
  );

  const applyCurrentFy = useCallback(() => {
    const range = currentAllJobsFinancialYearRange();
    setDraftFrom(range.from);
    setDraftTo(range.to);
    applyDateRange(range.from, range.to);
  }, [applyDateRange]);

  const applyAllDates = useCallback(() => {
    setDraftFrom(fyDefault.from);
    setDraftTo(fyDefault.to);
    applyDateRange("", "");
  }, [applyDateRange, fyDefault.from, fyDefault.to]);

  const handleGo = useCallback(() => {
    applyDateRange(draftFrom, draftTo);
  }, [applyDateRange, draftFrom, draftTo]);

  const tabs = useMemo(
    () => [
      {
        id: ALL_JOBS_TAB_RFQ,
        label: "RFQ",
        children: <DashboardRfqListPage embedded />,
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-title">All jobs</h1>
            <p className="mt-1 text-sm text-secondary">
              RFQ, work orders, and invoices in one place.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusFilterPillButton
            labelOnly
            className={DATE_FILTER_PILL_CLASS}
            card={{
              key: "fy",
              label: "Current FY",
              tileAppearance: resolveStatusTileProps("", 5),
            }}
            active={isCurrentFy}
            onClick={applyCurrentFy}
          />
          <StatusFilterPillButton
            labelOnly
            className={DATE_FILTER_PILL_CLASS}
            card={{
              key: "all",
              label: "All dates",
              tileAppearance: resolveStatusTileProps("", 6),
            }}
            active={isAllDates}
            onClick={applyAllDates}
          />
          <Input
            label="From"
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className={DATE_FILTER_INPUT_CLASS}
            inputClassName={DATE_FILTER_INPUT_FIELD_CLASS}
          />
          <Input
            label="To"
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className={DATE_FILTER_INPUT_CLASS}
            inputClassName={DATE_FILTER_INPUT_FIELD_CLASS}
          />
          <Button type="button" variant="primary" size="sm" className={DATE_FILTER_BUTTON_CLASS} onClick={handleGo}>
            Go
          </Button>
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
