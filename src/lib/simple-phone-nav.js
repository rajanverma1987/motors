import {
  SIMPLE_TAB_CALCULATORS,
  SIMPLE_TAB_CUSTOMERS,
  SIMPLE_TAB_DASHBOARD,
  SIMPLE_TAB_INVENTORY,
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_JOB_BOARD,
  SIMPLE_TAB_MASTER_DATA_SEARCH,
  SIMPLE_TAB_PURCHASE_ORDERS,
  SIMPLE_TAB_REPORTS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
} from "@/lib/simple-portal-tabs";

/** Bottom bar primary destinations (4 slots). Drawer opens from the top hamburger. */
export const SIMPLE_PHONE_BOTTOM_TABS = [
  { id: SIMPLE_TAB_SERVICE_PROPOSALS, label: "Proposals" },
  { id: SIMPLE_TAB_INVOICES, label: "Invoices" },
  { id: SIMPLE_TAB_PURCHASE_ORDERS, label: "Purchases" },
  { id: SIMPLE_TAB_MASTER_DATA_SEARCH, label: "Master Search" },
];

export const SIMPLE_PHONE_BOTTOM_TAB_IDS = SIMPLE_PHONE_BOTTOM_TABS.map((t) => t.id);

/** Drawer destinations: hub sections not in the bottom bar. */
export const SIMPLE_PHONE_DRAWER_TAB_META = [
  { id: SIMPLE_TAB_DASHBOARD, label: "Dashboard" },
  { id: SIMPLE_TAB_JOB_BOARD, label: "Job board" },
  { id: SIMPLE_TAB_CUSTOMERS, label: "Customers" },
  { id: SIMPLE_TAB_INVENTORY, label: "Inventory" },
  { id: SIMPLE_TAB_REPORTS, label: "Reports" },
  { id: SIMPLE_TAB_CALCULATORS, label: "Calculators" },
];

export const SIMPLE_PHONE_TAB_TITLES = {
  [SIMPLE_TAB_DASHBOARD]: "Dashboard",
  [SIMPLE_TAB_JOB_BOARD]: "Job board",
  [SIMPLE_TAB_CUSTOMERS]: "Customers",
  [SIMPLE_TAB_SERVICE_PROPOSALS]: "Service Proposals",
  [SIMPLE_TAB_INVOICES]: "Invoices / Receivables",
  [SIMPLE_TAB_PURCHASE_ORDERS]: "Purchase / Payable",
  [SIMPLE_TAB_INVENTORY]: "Inventory",
  [SIMPLE_TAB_REPORTS]: "Reports",
  [SIMPLE_TAB_MASTER_DATA_SEARCH]: "Master Data Search",
  [SIMPLE_TAB_CALCULATORS]: "Calculators",
};
