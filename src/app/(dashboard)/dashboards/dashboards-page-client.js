"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiPlus } from "react-icons/fi";
import Tabs from "@/components/ui/tabs";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import ServiceProposalsPanel, {
  SIMPLE_LIST_VARIANT_INVOICES,
  SIMPLE_LIST_VARIANT_PROPOSALS,
} from "./service-proposals-panel";
import PurchaseOrdersPanel from "./purchase-orders-panel";
import {
  SIMPLE_PORTAL_PATH,
  SIMPLE_TAB_ACCOUNTS_PAYABLE,
  SIMPLE_TAB_IDS,
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_PURCHASE_ORDERS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
} from "@/lib/simple-portal-tabs";
import {
  ALL_JOBS_DATE_FROM_PARAM,
  ALL_JOBS_DATE_TO_PARAM,
  currentAllJobsFinancialYearRange,
  isAllJobsCurrentFinancialYear,
  parseAllJobsDateRange,
} from "@/lib/all-jobs-date-filter";

const DATE_FILTER_PILL_CLASS =
  "!h-7 !min-h-7 shrink-0 !flex !items-center !justify-center !rounded !border-border/80 !px-2 !py-0 text-xs font-semibold !shadow-none";
const DATE_FILTER_INPUT_CLASS =
  "mb-0 !flex !w-auto !min-w-0 !flex-row !items-center !gap-1 [&_label]:mb-0 [&_label]:shrink-0 [&_label]:text-[11px] [&_label]:font-medium [&_label]:text-secondary";
const DATE_FILTER_INPUT_FIELD_CLASS =
  "!h-7 !min-h-7 !w-[8.75rem] !rounded !border-border/80 !px-1.5 !py-0 text-xs leading-none";
const DATE_FILTER_BUTTON_CLASS = "h-7 shrink-0 rounded px-2.5 text-xs";

function BlankPanel({ title }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="text-lg font-semibold text-title">{title}</h2>
      <p className="mt-1 text-sm text-secondary">Content coming soon.</p>
    </div>
  );
}

export default function DashboardsPageClient() {
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
  const [createNonce, setCreateNonce] = useState(0);
  const [poCreateNonce, setPoCreateNonce] = useState(0);

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

  const applyCurrentFy = useCallback(() => {
    applyDateRange(fyDefault.from, fyDefault.to);
  }, [applyDateRange, fyDefault.from, fyDefault.to]);

  const applyAllDates = useCallback(() => {
    applyDateRange("", "");
  }, [applyDateRange]);

  const handleGo = useCallback(() => {
    applyDateRange(draftFrom, draftTo);
  }, [applyDateRange, draftFrom, draftTo]);

  const handleTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTab) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.replace(`${SIMPLE_PORTAL_PATH}?${params.toString()}`, { scroll: false });
    },
    [activeTab, router, searchParams]
  );

  const handleAddNew = useCallback(() => {
    if (activeTab === SIMPLE_TAB_PURCHASE_ORDERS) {
      setPoCreateNonce((n) => n + 1);
      return;
    }
    if (activeTab !== SIMPLE_TAB_SERVICE_PROPOSALS) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", SIMPLE_TAB_SERVICE_PROPOSALS);
      router.replace(`${SIMPLE_PORTAL_PATH}?${params.toString()}`, { scroll: false });
    }
    setCreateNonce((n) => n + 1);
  }, [activeTab, router, searchParams]);

  const tabs = useMemo(
    () => [
      {
        id: SIMPLE_TAB_SERVICE_PROPOSALS,
        label: "Service Proposals",
        children: (
          <ServiceProposalsPanel
            variant={SIMPLE_LIST_VARIANT_PROPOSALS}
            createNonce={createNonce}
          />
        ),
      },
      {
        id: SIMPLE_TAB_INVOICES,
        label: "Invoices",
        children: <ServiceProposalsPanel variant={SIMPLE_LIST_VARIANT_INVOICES} />,
      },
      {
        id: SIMPLE_TAB_PURCHASE_ORDERS,
        label: "Purchase Orders",
        children: <PurchaseOrdersPanel createNonce={poCreateNonce} />,
      },
      {
        id: SIMPLE_TAB_ACCOUNTS_PAYABLE,
        label: "Account Payables",
        children: <BlankPanel title="Account Payables" />,
      },
    ],
    [createNonce, poCreateNonce]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-2 shrink-0 border-b border-border pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <StatusFilterPillButton
              labelOnly
              className={DATE_FILTER_PILL_CLASS}
              card={{
                key: "fy",
                label: "FY",
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
                label: "All",
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
          {activeTab === SIMPLE_TAB_SERVICE_PROPOSALS || activeTab === SIMPLE_TAB_PURCHASE_ORDERS ? (
            <Button type="button" variant="primary" size="sm" className={DATE_FILTER_BUTTON_CLASS} onClick={handleAddNew}>
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              Add New
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
        ariaLabel="Simple portal sections"
      />
    </div>
  );
}
