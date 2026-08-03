"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiBarChart2,
  FiClipboard,
  FiFileText,
  FiPackage,
  FiShoppingCart,
  FiSliders,
  FiUsers,
} from "react-icons/fi";
import Tabs from "@/components/ui/tabs";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import { useAuth } from "@/contexts/auth-context";
import ServiceProposalsPanel, {
  SIMPLE_LIST_VARIANT_INVOICES,
  SIMPLE_LIST_VARIANT_PROPOSALS,
} from "./service-proposals-panel";
import PurchaseOrdersPanel from "./purchase-orders-panel";
import InventoryPanel from "./inventory-panel";
import CustomersPanel from "./customers-panel";
import ReportsPanel from "./reports-panel";
import CalculatorsPanel from "./calculators-panel";
import {
  SIMPLE_PORTAL_PATH,
  SIMPLE_TAB_CALCULATORS,
  SIMPLE_TAB_CUSTOMERS,
  SIMPLE_TAB_IDS,
  SIMPLE_TAB_INVENTORY,
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_PURCHASE_ORDERS,
  SIMPLE_TAB_REPORTS,
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
  "!h-7 !min-h-7 shrink-0 !flex !items-center !justify-center !rounded-none !border-border/80 !px-2 !py-0 text-xs font-semibold !shadow-none";
const DATE_FILTER_INPUT_CLASS =
  "mb-0 !flex !w-auto !min-w-0 !flex-row !items-center !gap-1 [&_label]:mb-0 [&_label]:shrink-0 [&_label]:text-[11px] [&_label]:font-medium [&_label]:text-secondary";
const DATE_FILTER_INPUT_FIELD_CLASS =
  "!h-7 !min-h-7 !w-[8.75rem] !rounded-none !border-border/80 !px-1.5 !py-0 text-xs leading-none";
const DATE_FILTER_BUTTON_CLASS = "h-7 shrink-0 !rounded-none px-2.5 text-xs";

/** Square UI — only used on Simple `/dashboards`. */
const DASHBOARDS_SQUARE_UI_CLASS = [
  "[&_button]:!rounded-none",
  "[&_input]:!rounded-none",
  "[&_textarea]:!rounded-none",
  "[&_select]:!rounded-none",
  "[&_.status-filter-pill]:!rounded-none",
  "[&_.status-filter-pill_span]:!rounded-none",
].join(" ");
const DASHBOARDS_TAB_LIST_CLASS =
  "shrink-0 !flex-nowrap !gap-2 !rounded-none !border-0 !bg-transparent !p-0 dark:!bg-transparent";
const DASHBOARDS_TAB_BUTTON_CLASS =
  "!box-border !flex !h-[5.75rem] !w-[5.75rem] !shrink-0 !flex-col !items-center !justify-center !rounded-none !px-1.5 !py-2 sm:!h-[6.25rem] sm:!w-[6.25rem]";

function TabLabel({ icon: Icon, children }) {
  return (
    <span className="flex w-full flex-col items-center justify-center gap-1.5 text-center">
      {Icon ? <Icon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden /> : null}
      <span className="max-w-full px-0.5 text-[12px] font-bold leading-tight whitespace-normal sm:text-[13px]">
        {children}
      </span>
    </span>
  );
}

export default function DashboardsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const calcOnly = !!user?.calculatorOnlyAccount;
  const tabParam = searchParams.get("tab");
  const activeTab = calcOnly
    ? SIMPLE_TAB_CALCULATORS
    : SIMPLE_TAB_IDS.includes(tabParam)
      ? tabParam
      : SIMPLE_TAB_SERVICE_PROPOSALS;

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

  /** Square inputs/buttons in page + portaled form modals while Simple `/dashboards` is mounted. */
  useEffect(() => {
    document.body.classList.add("simple-dashboards-square-inputs");
    return () => {
      document.body.classList.remove("simple-dashboards-square-inputs");
    };
  }, []);

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
      if (calcOnly && nextTab !== SIMPLE_TAB_CALCULATORS) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", nextTab);
      router.replace(`${SIMPLE_PORTAL_PATH}?${params.toString()}`, { scroll: false });
    },
    [activeTab, calcOnly, router, searchParams]
  );

  useEffect(() => {
    if (!calcOnly) return;
    if (tabParam === SIMPLE_TAB_CALCULATORS) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", SIMPLE_TAB_CALCULATORS);
    router.replace(`${SIMPLE_PORTAL_PATH}?${params.toString()}`, { scroll: false });
  }, [calcOnly, router, searchParams, tabParam]);

  const tabs = useMemo(() => {
    const all = [
      {
        id: SIMPLE_TAB_CUSTOMERS,
        label: <TabLabel icon={FiUsers}>Customers</TabLabel>,
        children: <CustomersPanel />,
      },
      {
        id: SIMPLE_TAB_SERVICE_PROPOSALS,
        label: <TabLabel icon={FiFileText}>Service Proposals</TabLabel>,
        children: <ServiceProposalsPanel variant={SIMPLE_LIST_VARIANT_PROPOSALS} />,
      },
      {
        id: SIMPLE_TAB_INVOICES,
        label: <TabLabel icon={FiClipboard}>Invoices / Receivables</TabLabel>,
        children: <ServiceProposalsPanel variant={SIMPLE_LIST_VARIANT_INVOICES} />,
      },
      {
        id: SIMPLE_TAB_PURCHASE_ORDERS,
        label: <TabLabel icon={FiShoppingCart}>Purchase / Payable</TabLabel>,
        children: <PurchaseOrdersPanel />,
      },
      {
        id: SIMPLE_TAB_INVENTORY,
        label: <TabLabel icon={FiPackage}>Inventory</TabLabel>,
        children: <InventoryPanel />,
      },
      {
        id: SIMPLE_TAB_REPORTS,
        label: <TabLabel icon={FiBarChart2}>Reports</TabLabel>,
        children: <ReportsPanel />,
      },
      {
        id: SIMPLE_TAB_CALCULATORS,
        label: <TabLabel icon={FiSliders}>Calculators</TabLabel>,
        children: <CalculatorsPanel />,
      },
    ];
    return calcOnly ? all.filter((t) => t.id === SIMPLE_TAB_CALCULATORS) : all;
  }, [calcOnly]);

  return (
    <div
      className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden ${DASHBOARDS_SQUARE_UI_CLASS}`}
    >
      {activeTab !== SIMPLE_TAB_CALCULATORS && !calcOnly ? (
        <div className="mb-2 shrink-0 border-b border-border pb-2">
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
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
        </div>
      ) : null}

      <Tabs
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        listClassName={DASHBOARDS_TAB_LIST_CLASS}
        tabButtonClassName={DASHBOARDS_TAB_BUTTON_CLASS}
        panelClassName="flex min-h-0 flex-1 flex-col overflow-hidden pt-4"
        value={activeTab}
        onChange={handleTabChange}
        tabs={tabs}
        ariaLabel="Simple portal sections"
      />
    </div>
  );
}
