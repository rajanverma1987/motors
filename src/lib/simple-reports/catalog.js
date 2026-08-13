/** Simple portal Excel report ids + UI metadata. */

export const SIMPLE_REPORT_IDS = [
  "jobs-pipeline",
  "invoices-ar",
  "purchase-ap",
  "vendor-spend",
  "inventory-stock",
  "customers",
  "sales-commissions",
  "sales-tax",
  "purchase-tax",
  "ar-aging",
  "ap-aging",
  "cash-receipts",
];

/** @typedef {{ key: string, label: string, options: { value: string, label: string }[] }} SimpleReportFilterDef */

/** @type {Record<string, SimpleReportFilterDef[]>} */
export const SIMPLE_REPORT_FILTERS = {
  "jobs-pipeline": [
    {
      key: "type",
      label: "Type",
      options: [
        { value: "", label: "All types" },
        { value: "RFQ", label: "RFQ" },
        { value: "JOB", label: "JOB" },
      ],
    },
    {
      key: "status",
      label: "Doc status",
      options: [
        { value: "", label: "All statuses" },
        { value: "open", label: "Open / in progress" },
        { value: "closed", label: "Closed / accepted / lost" },
      ],
    },
  ],
  "invoices-ar": [
    {
      key: "payment",
      label: "Payment",
      options: [
        { value: "", label: "All" },
        { value: "unpaid", label: "Unpaid" },
        { value: "paid", label: "Paid" },
      ],
    },
  ],
  "purchase-ap": [
    {
      key: "poType",
      label: "PO type",
      options: [
        { value: "", label: "All types" },
        { value: "job", label: "Job PO" },
        { value: "shop", label: "Shop PO" },
      ],
    },
    {
      key: "payment",
      label: "Payment",
      options: [
        { value: "", label: "All" },
        { value: "Unpaid", label: "Unpaid" },
        { value: "Partial Paid", label: "Partial Paid" },
        { value: "Paid", label: "Paid" },
      ],
    },
    {
      key: "receiving",
      label: "Receiving",
      options: [
        { value: "", label: "All" },
        { value: "Ordered", label: "Ordered" },
        { value: "Partially Received", label: "Partially Received" },
        { value: "Received", label: "Received" },
      ],
    },
  ],
  "vendor-spend": [
    {
      key: "poType",
      label: "PO type",
      options: [
        { value: "", label: "All types" },
        { value: "job", label: "Job PO" },
        { value: "shop", label: "Shop PO" },
      ],
    },
    {
      key: "payment",
      label: "Payment",
      options: [
        { value: "", label: "All" },
        { value: "Unpaid", label: "Unpaid" },
        { value: "Partial Paid", label: "Partial Paid" },
        { value: "Paid", label: "Paid" },
      ],
    },
  ],
  "inventory-stock": [
    {
      key: "stock",
      label: "Stock",
      options: [
        { value: "", label: "All parts" },
        { value: "low", label: "Low stock only" },
        { value: "available", label: "Available > 0" },
        { value: "zero", label: "Zero available" },
      ],
    },
  ],
  customers: [
    {
      key: "taxExempt",
      label: "Tax exempt",
      options: [
        { value: "", label: "All" },
        { value: "yes", label: "Exempt" },
        { value: "no", label: "Taxable" },
      ],
    },
  ],
  "sales-commissions": [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "", label: "All" },
        { value: "unpaid", label: "Unpaid" },
        { value: "paid", label: "Paid" },
      ],
    },
  ],
  "sales-tax": [
    {
      key: "collection",
      label: "Tax status",
      options: [
        { value: "", label: "All taxable invoices" },
        { value: "collected", label: "Tax collected (paid)" },
        { value: "outstanding", label: "Tax to be collected" },
      ],
    },
  ],
  "purchase-tax": [
    {
      key: "poType",
      label: "PO type",
      options: [
        { value: "", label: "All types" },
        { value: "job", label: "Job PO" },
        { value: "shop", label: "Shop PO" },
      ],
    },
  ],
  "ar-aging": [
    {
      key: "bucket",
      label: "Aging bucket",
      options: [
        { value: "", label: "All unpaid" },
        { value: "current", label: "Current (not past due)" },
        { value: "1-30", label: "1–30 days" },
        { value: "31-60", label: "31–60 days" },
        { value: "61-90", label: "61–90 days" },
        { value: "90+", label: "90+ days" },
        { value: "no-due", label: "No due date" },
      ],
    },
  ],
  "ap-aging": [
    {
      key: "bucket",
      label: "Aging bucket",
      options: [
        { value: "", label: "All unpaid" },
        { value: "current", label: "Current (not past due)" },
        { value: "1-30", label: "1–30 days" },
        { value: "31-60", label: "31–60 days" },
        { value: "61-90", label: "61–90 days" },
        { value: "90+", label: "90+ days" },
        { value: "no-due", label: "No due date" },
      ],
    },
  ],
  "cash-receipts": [],
};

export const SIMPLE_REPORT_CATALOG = [
  {
    id: "jobs-pipeline",
    category: "Operations",
    title: "Jobs pipeline",
    description: "RFQ and JOB service proposals with status, customer, and totals.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["jobs-pipeline"],
  },
  {
    id: "invoices-ar",
    category: "Accounting",
    title: "Invoices / AR",
    description: "Invoice records with billed totals, paid dates, and unpaid balance.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["invoices-ar"],
  },
  {
    id: "purchase-ap",
    category: "Accounting",
    title: "Purchase / AP",
    description: "Purchase orders with vendor, payment status, and balances.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["purchase-ap"],
  },
  {
    id: "vendor-spend",
    category: "Accounting",
    title: "Vendor spend",
    description: "Spend rolled up by vendor from purchase orders in the date range.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["vendor-spend"],
  },
  {
    id: "sales-tax",
    category: "Accounting",
    title: "Sales tax",
    description:
      "Sales tax on invoices — rate, tax amount, and whether tax is collected (paid) or still outstanding.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["sales-tax"],
  },
  {
    id: "purchase-tax",
    category: "Accounting",
    title: "Purchase tax",
    description: "Tax charged on purchase order lines (taxable vendor purchases).",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["purchase-tax"],
  },
  {
    id: "ar-aging",
    category: "Accounting",
    title: "AR aging",
    description: "Unpaid invoices by days past due (current, 1–30, 31–60, 61–90, 90+).",
    usesDateRange: false,
    filters: SIMPLE_REPORT_FILTERS["ar-aging"],
  },
  {
    id: "ap-aging",
    category: "Accounting",
    title: "AP aging",
    description: "Unpaid purchase order balances by days past due.",
    usesDateRange: false,
    filters: SIMPLE_REPORT_FILTERS["ap-aging"],
  },
  {
    id: "cash-receipts",
    category: "Accounting",
    title: "Cash receipts",
    description: "Paid invoices in the date range (cash / payment received).",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["cash-receipts"],
  },
  {
    id: "inventory-stock",
    category: "Operations",
    title: "Inventory stock",
    description: "Current on-hand, reserved, available, and low-stock parts (snapshot).",
    usesDateRange: false,
    filters: SIMPLE_REPORT_FILTERS["inventory-stock"],
  },
  {
    id: "customers",
    category: "Operations",
    title: "Customers",
    description: "Customer master list with contact, credit, and tax settings (snapshot).",
    usesDateRange: false,
    filters: SIMPLE_REPORT_FILTERS.customers,
  },
  {
    id: "sales-commissions",
    category: "Sales",
    title: "Sales commissions",
    description: "Commission amounts by sales person, job, and paid status.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["sales-commissions"],
  },
];

/**
 * @param {string} id
 */
export function isValidSimpleReportId(id) {
  return SIMPLE_REPORT_IDS.includes(String(id || "").trim());
}

/**
 * Parse allowed filter query params for a report.
 * @param {string} reportId
 * @param {URLSearchParams | Record<string, string>} params
 */
export function parseReportFilters(reportId, params) {
  const defs = SIMPLE_REPORT_FILTERS[String(reportId || "").trim()] || [];
  /** @type {Record<string, string>} */
  const out = {};
  const get =
    typeof params?.get === "function"
      ? (key) => params.get(key)
      : (key) => params?.[key];

  for (const def of defs) {
    const raw = String(get(def.key) ?? "").trim();
    const allowed = new Set(def.options.map((o) => o.value));
    out[def.key] = allowed.has(raw) ? raw : "";
  }
  return out;
}
