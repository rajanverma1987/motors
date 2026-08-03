"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import {
  ALL_JOBS_DATE_FROM_PARAM,
  ALL_JOBS_DATE_TO_PARAM,
  currentAllJobsFinancialYearRange,
  isAllJobsCurrentFinancialYear,
  parseAllJobsDateRange,
} from "@/lib/all-jobs-date-filter";
import {
  SIMPLE_PORTAL_PATH,
  SIMPLE_TAB_CALCULATORS,
  SIMPLE_TAB_IDS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
} from "@/lib/simple-portal-tabs";

const DATE_FILTER_PILL_CLASS =
  "!h-7 !min-h-7 shrink-0 !flex !items-center !justify-center !rounded-none !border-border/80 !bg-card !px-2 !py-0 text-xs font-semibold !shadow-none";
const DATE_FILTER_INPUT_CLASS =
  "mb-0 !flex !w-auto !min-w-0 !flex-row !items-center !gap-1 [&_label]:mb-0 [&_label]:shrink-0 [&_label]:text-[11px] [&_label]:font-medium [&_label]:text-secondary";
const DATE_FILTER_INPUT_FIELD_CLASS =
  "!h-7 !min-h-7 !w-[8.25rem] !rounded-none !border-border/80 !bg-bg !px-1.5 !py-0 text-xs leading-none";
const DATE_FILTER_BUTTON_CLASS = "h-7 shrink-0 !rounded-none px-2.5 text-xs";

/**
 * Hub date range controls for Simple `/dashboards` (lives in navbar).
 */
export default function SimpleHubDateFilter({ className = "" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = SIMPLE_TAB_IDS.includes(tabParam) ? tabParam : SIMPLE_TAB_SERVICE_PROPOSALS;

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
      router.replace(`${SIMPLE_PORTAL_PATH}?${params.toString()}`, { scroll: false });
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

  if (activeTab === SIMPLE_TAB_CALCULATORS) return null;

  return (
    <div
      className={`simple-hub-date-bar simple-hub-date-bar--nav shrink-0 ${className}`.trim()}
      role="group"
      aria-label="Hub date range"
    >
      <StatusFilterPillButton
        labelOnly
        className={DATE_FILTER_PILL_CLASS}
        card={{
          key: "fy",
          label: "FY",
          tileAppearance: resolveStatusTileProps("", 5),
        }}
        active={isCurrentFy}
        onClick={() => applyDateRange(fyDefault.from, fyDefault.to)}
      />
      <StatusFilterPillButton
        labelOnly
        className={DATE_FILTER_PILL_CLASS}
        card={{
          key: "all",
          label: "All",
          tileAppearance: resolveStatusTileProps("", 6),
        }}
        active={isAllDates}
        onClick={() => applyDateRange("", "")}
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
      <Button
        type="button"
        variant="primary"
        size="sm"
        className={DATE_FILTER_BUTTON_CLASS}
        onClick={() => applyDateRange(draftFrom, draftTo)}
      >
        Go
      </Button>
    </div>
  );
}
