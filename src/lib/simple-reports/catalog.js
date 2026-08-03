/** Simple portal Excel report ids + UI metadata. */

export const SIMPLE_REPORT_IDS = [
  "jobs-pipeline",
  "invoices-ar",
  "purchase-ap",
  "vendor-spend",
  "inventory-stock",
  "customers",
  "sales-commissions",
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
};

export const SIMPLE_REPORT_CATALOG = [
  {
    id: "jobs-pipeline",
    title: "Jobs pipeline",
    description: "RFQ and JOB service proposals with status, customer, and totals.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["jobs-pipeline"],
  },
  {
    id: "invoices-ar",
    title: "Invoices / AR",
    description: "Invoice records with billed totals, paid dates, and unpaid balance.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["invoices-ar"],
  },
  {
    id: "purchase-ap",
    title: "Purchase / AP",
    description: "Purchase orders with vendor, payment status, and balances.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["purchase-ap"],
  },
  {
    id: "vendor-spend",
    title: "Vendor spend",
    description: "Spend rolled up by vendor from purchase orders in the date range.",
    usesDateRange: true,
    filters: SIMPLE_REPORT_FILTERS["vendor-spend"],
  },
  {
    id: "inventory-stock",
    title: "Inventory stock",
    description: "Current on-hand, reserved, available, and low-stock parts (snapshot).",
    usesDateRange: false,
    filters: SIMPLE_REPORT_FILTERS["inventory-stock"],
  },
  {
    id: "customers",
    title: "Customers",
    description: "Customer master list with contact, credit, and tax settings (snapshot).",
    usesDateRange: false,
    filters: SIMPLE_REPORT_FILTERS.customers,
  },
  {
    id: "sales-commissions",
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
