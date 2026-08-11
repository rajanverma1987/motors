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
import { SIMPLE_PORTAL_ROOT_CLASS } from "@/lib/simple-screen-ui";

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
  "simple-hub-tablist shrink-0 !flex-nowrap !gap-[2px] !overflow-x-auto !rounded-none !border-0 !bg-transparent !p-0 dark:!bg-transparent";
const DASHBOARDS_TAB_BUTTON_CLASS =
  "!box-border !flex !h-[4.75rem] !min-w-0 !flex-1 !flex-col !items-center !justify-center !rounded-none !px-1 !py-2 sm:!h-[5.25rem]";

function TabLabel({ icon: Icon, children }) {
  return (
    <span className="flex w-full flex-col items-center justify-center gap-1.5 text-center">
      {Icon ? <Icon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" aria-hidden /> : null}
      <span className="max-w-full px-0.5 text-[11px] font-bold leading-tight whitespace-normal sm:text-[12px]">
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
  const urlTab = calcOnly
    ? SIMPLE_TAB_CALCULATORS
    : SIMPLE_TAB_IDS.includes(tabParam)
      ? tabParam
      : SIMPLE_TAB_SERVICE_PROPOSALS;
  /** Immediate UI feedback — URL sync via router.replace can lag and feel like dead clicks. */
  const [pendingTab, setPendingTab] = useState(null);
  const activeTab =
    pendingTab && SIMPLE_TAB_IDS.includes(pendingTab) ? pendingTab : urlTab;

  useEffect(() => {
    setPendingTab(null);
  }, [urlTab]);

  /** Square inputs/buttons in page + portaled form modals while Simple `/dashboards` is mounted. */
  useEffect(() => {
    document.body.classList.add("simple-dashboards-square-inputs");
    return () => {
      document.body.classList.remove("simple-dashboards-square-inputs");
    };
  }, []);

  const handleTabChange = useCallback(
    (nextTab) => {
      if (!nextTab || nextTab === activeTab) return;
      if (calcOnly && nextTab !== SIMPLE_TAB_CALCULATORS) return;
      setPendingTab(nextTab);
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
      className={`${SIMPLE_PORTAL_ROOT_CLASS} flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden ${DASHBOARDS_SQUARE_UI_CLASS}`}
    >
      <Tabs
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        listClassName={DASHBOARDS_TAB_LIST_CLASS}
        tabButtonClassName={DASHBOARDS_TAB_BUTTON_CLASS}
        panelClassName="flex min-h-0 flex-1 flex-col overflow-hidden pt-0"
        value={activeTab}
        onChange={handleTabChange}
        tabs={tabs}
        ariaLabel="Simple portal sections"
        keepMounted
        animatePanel={false}
      />
    </div>
  );
}
