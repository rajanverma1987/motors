import Customer from "@/models/Customer";
import InventoryItem from "@/models/InventoryItem";
import SalesCommission from "@/models/SalesCommission";
import SalesPerson from "@/models/SalesPerson";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { resolveSimplePoType } from "@/lib/simple-purchase-order-form";
import {
  agingBucketLabel,
  agingFromDueDate,
  boolLabel,
  computePoMoney,
  computeSpInvoiceMoney,
  computeSpMoney,
  dayInRange,
  formatReportDate,
  isInvoiceSp,
  isPipelineSp,
  isSpInvoicePaid,
  matchPipelineStatusBucket,
  moneyCell,
  resolveDocDay,
  toYmd,
} from "@/lib/simple-reports/helpers";
import { buildSimpleReportWorkbook, isReportAmountHeader } from "@/lib/simple-reports/workbook";
import { buildSimpleReportPdfBuffer } from "@/lib/simple-reports/pdf";
import { isValidSimpleReportId } from "@/lib/simple-reports/catalog";
import { normalizeInvoicePayments, parseMoneyInput } from "@/lib/simple-service-proposal-form";

const FETCH_LIMIT = 20000;
const VIEW_DEFAULT_PAGE_SIZE = 50;
const VIEW_MAX_PAGE_SIZE = 200;

/** Default sort column (0-based) — prefer primary date, else meaningful amount/name. */
const DEFAULT_SORT_COLUMN = {
  "jobs-pipeline": 6, // Date created
  "invoices-ar": 4, // Date created
  "purchase-ap": 6, // PO date
  "vendor-spend": 2, // Ordered total
  "inventory-stock": 0, // Part
  "customers": 10, // Created
  "sales-commissions": 7, // Created
  "sales-tax": 3, // Invoice date
  "purchase-tax": 4, // PO date
  "ar-aging": 4, // Invoice date
  "ap-aging": 4, // PO date
  "cash-receipts": 2, // Paid date
};

const DEFAULT_SORT_DIR = {
  "inventory-stock": "asc",
};

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {"asc"|"desc"} dir
 */
function compareReportCells(a, b, dir) {
  const mul = dir === "asc" ? 1 : -1;
  const sa = a == null ? "" : String(a).trim();
  const sb = b == null ? "" : String(b).trim();
  if (sa === "" && sb === "") return 0;
  if (sa === "") return 1 * mul;
  if (sb === "") return -1 * mul;
  const na = Number(sa.replace(/,/g, ""));
  const nb = Number(sb.replace(/,/g, ""));
  if (Number.isFinite(na) && Number.isFinite(nb) && /^-?\d+(\.\d+)?$/.test(sa.replace(/,/g, "")) && /^-?\d+(\.\d+)?$/.test(sb.replace(/,/g, ""))) {
    if (na !== nb) return (na - nb) * mul;
    return 0;
  }
  return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" }) * mul;
}

/**
 * @param {Array<Array<unknown>>} rows
 * @param {number[]} amountColumns
 */
function sumAmountColumns(rows, amountColumns, colCount) {
  const totals = new Array(colCount).fill(null);
  for (const colIdx of amountColumns) {
    let sum = 0;
    for (const row of rows) {
      const n = Number(row?.[colIdx]);
      if (Number.isFinite(n)) sum += n;
    }
    totals[colIdx] = sum;
  }
  return totals;
}

/**
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array<Array<string|number|boolean|null|undefined>>} rows
 * @param {string} filenameBase
 * @param {{
 *   amountColumns?: number[],
 *   format?: "xlsx"|"json"|"pdf",
 *   page?: number,
 *   pageSize?: number,
 *   sortBy?: number|string,
 *   sortDir?: string,
 *   rowSortKeys?: string[],
 *   defaultSortColumn?: number,
 *   subtitle?: string,
 * }} [options]
 */
async function finalizeReport(sheetName, headers, rows, filenameBase, options = {}) {
  const safeHeaders = Array.isArray(headers) ? headers.map((h) => String(h ?? "")) : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const amountColumns =
    Array.isArray(options.amountColumns) && options.amountColumns.length > 0
      ? options.amountColumns.filter((i) => Number.isInteger(i) && i >= 0 && i < safeHeaders.length)
      : safeHeaders.map((h, i) => (isReportAmountHeader(h) ? i : -1)).filter((i) => i >= 0);

  const stamp = fileStamp();
  const tableRows = safeRows.map((row) =>
    safeHeaders.map((_, idx) => {
      const cell = row?.[idx];
      return cell == null ? "" : cell;
    })
  );

  const defaultSortColumn =
    Number.isInteger(options.defaultSortColumn) && options.defaultSortColumn >= 0
      ? options.defaultSortColumn
      : DEFAULT_SORT_COLUMN[filenameBase] ?? 0;
  const defaultSortDir = DEFAULT_SORT_DIR[filenameBase] || "desc";

  let sortBy = Number(options.sortBy);
  if (!Number.isInteger(sortBy) || sortBy < 0 || sortBy >= safeHeaders.length) {
    sortBy = defaultSortColumn;
  }
  const sortDir = options.sortDir === "asc" || options.sortDir === "desc" ? options.sortDir : defaultSortDir;
  const sortKeys = Array.isArray(options.rowSortKeys) ? options.rowSortKeys : null;
  const useSortKeys =
    Array.isArray(sortKeys) &&
    sortKeys.length === tableRows.length &&
    sortBy === defaultSortColumn;

  const indexed = tableRows.map((row, i) => ({ row, key: useSortKeys ? String(sortKeys[i] || "") : "", i }));
  indexed.sort((a, b) => {
    if (useSortKeys) {
      const cmp = String(a.key).localeCompare(String(b.key));
      if (cmp !== 0) return sortDir === "asc" ? cmp : -cmp;
      return a.i - b.i;
    }
    const cmp = compareReportCells(a.row[sortBy], b.row[sortBy], sortDir);
    if (cmp !== 0) return cmp;
    return a.i - b.i;
  });
  const sortedRows = indexed.map((x) => x.row);
  const amountTotals = sumAmountColumns(sortedRows, amountColumns, safeHeaders.length);

  if (options.format === "json") {
    const pageSize = Math.min(
      VIEW_MAX_PAGE_SIZE,
      Math.max(1, Number(options.pageSize) || VIEW_DEFAULT_PAGE_SIZE)
    );
    const totalCount = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil((totalCount || 1) / pageSize));
    const page = Math.min(totalPages, Math.max(1, Number(options.page) || 1));
    const start = (page - 1) * pageSize;
    const pageRows = sortedRows.slice(start, start + pageSize);
    return {
      buffer: null,
      sheetName: String(sheetName || "Report"),
      headers: safeHeaders,
      rows: pageRows,
      amountColumns,
      amountTotals,
      rowCount: totalCount,
      page,
      pageSize,
      totalPages,
      sortBy,
      sortDir,
      defaultSortColumn,
      filename: `${filenameBase}-${stamp}.xlsx`,
    };
  }

  if (options.format === "pdf") {
    const buffer = await buildSimpleReportPdfBuffer(sheetName, safeHeaders, sortedRows, {
      amountColumns,
      amountTotals,
      subtitle: options.subtitle,
    });
    return {
      buffer,
      sheetName: String(sheetName || "Report"),
      headers: safeHeaders,
      rows: sortedRows,
      amountColumns,
      amountTotals,
      rowCount: sortedRows.length,
      filename: `${filenameBase}-${stamp}.pdf`,
    };
  }

  const buffer = await buildSimpleReportWorkbook(sheetName, safeHeaders, sortedRows, {
    amountColumns,
  });
  return {
    buffer,
    sheetName: String(sheetName || "Report"),
    headers: safeHeaders,
    rows: sortedRows,
    amountColumns,
    amountTotals,
    rowCount: sortedRows.length,
    filename: `${filenameBase}-${stamp}.xlsx`,
  };
}

/** Push a report row and its ISO date sort key (YYYY-MM-DD). */
function pushReportRow(rows, sortKeys, sortDay, cells) {
  rows.push(cells);
  sortKeys.push(toYmd(sortDay) || "");
}

/**
 * @param {{
 *   report: string,
 *   ownerEmail: string,
 *   from?: string,
 *   to?: string,
 *   filters?: Record<string, string>,
 *   format?: "xlsx"|"json"|"pdf",
 *   page?: number,
 *   pageSize?: number,
 *   sortBy?: number|string,
 *   sortDir?: string,
 *   subtitle?: string,
 * }} opts
 */
export async function buildSimpleReportExport(opts) {
  const report = String(opts.report || "").trim();
  if (!isValidSimpleReportId(report)) {
    throw new Error("Unknown report");
  }
  const ownerEmail = String(opts.ownerEmail || "").trim().toLowerCase();
  if (!ownerEmail) throw new Error("Unauthorized");

  const from = String(opts.from || "").trim().slice(0, 10);
  const to = String(opts.to || "").trim().slice(0, 10);
  const filters = opts.filters && typeof opts.filters === "object" ? opts.filters : {};
  const format = opts.format === "json" || opts.format === "pdf" ? opts.format : "xlsx";
  const currency = await loadOwnerCurrency(ownerEmail);
  const reportOpts = {
    format,
    page: opts.page,
    pageSize: opts.pageSize,
    sortBy: opts.sortBy,
    sortDir: opts.sortDir,
    subtitle: opts.subtitle,
  };

  switch (report) {
    case "jobs-pipeline":
      return buildJobsPipeline(ownerEmail, from, to, currency, filters, reportOpts);
    case "invoices-ar":
      return buildInvoicesAr(ownerEmail, from, to, currency, filters, reportOpts);
    case "purchase-ap":
      return buildPurchaseAp(ownerEmail, from, to, currency, filters, reportOpts);
    case "vendor-spend":
      return buildVendorSpend(ownerEmail, from, to, filters, reportOpts);
    case "inventory-stock":
      return buildInventoryStock(ownerEmail, filters, reportOpts);
    case "customers":
      return buildCustomers(ownerEmail, filters, reportOpts);
    case "sales-commissions":
      return buildSalesCommissions(ownerEmail, from, to, currency, filters, reportOpts);
    case "sales-tax":
      return buildSalesTax(ownerEmail, from, to, currency, filters, reportOpts);
    case "purchase-tax":
      return buildPurchaseTax(ownerEmail, from, to, currency, filters, reportOpts);
    case "ar-aging":
      return buildArAging(ownerEmail, currency, filters, reportOpts);
    case "ap-aging":
      return buildApAging(ownerEmail, currency, filters, reportOpts);
    case "cash-receipts":
      return buildCashReceipts(ownerEmail, from, to, currency, reportOpts);
    default:
      throw new Error("Unknown report");
  }
}

async function loadOwnerCurrency(ownerEmail) {
  const settingsDoc = await UserSettings.findOne({ ownerEmail }).lean();
  const merged = mergeUserSettings(settingsDoc?.settings);
  return String(merged?.currency || "USD").toUpperCase().trim() || "USD";
}

async function loadServiceProposals(ownerEmail) {
  return SimpleServiceProposal.find({ createdByEmail: ownerEmail })
    .sort({ updatedAt: -1 })
    .limit(FETCH_LIMIT)
    .lean();
}

async function loadPurchaseOrders(ownerEmail) {
  return SimplePurchaseOrder.find({ createdByEmail: ownerEmail })
    .sort({ updatedAt: -1 })
    .limit(FETCH_LIMIT)
    .lean();
}

async function buildJobsPipeline(ownerEmail, from, to, currency, filters, reportOpts = {}) {
  const docs = await loadServiceProposals(ownerEmail);
  const typeFilter = String(filters.type || "").toUpperCase();
  const statusBucket = String(filters.status || "").trim();
  const headers = [
    "Document #",
    "Type",
    "Customer",
    "Status",
    "Job status",
    "Prepared by",
    "Date created",
    "Due date",
    "Submit date",
    "Accepted date",
    "Scope total",
    "Other items",
    "Tax",
    "Grand total",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    if (!isPipelineSp(doc)) continue;
    const recordType = String(doc.recordType || "RFQ").toUpperCase();
    if (typeFilter && recordType !== typeFilter) continue;
    if (!matchPipelineStatusBucket(doc.status, statusBucket)) continue;
    const day = resolveDocDay(doc, ["dateCreated", "date", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    const money = computeSpMoney(doc);
    pushReportRow(rows, sortKeys, day, [
      String(doc.documentNumber || doc.quote || "").trim(),
      recordType,
      String(doc.companyName || "").trim(),
      String(doc.status || "").trim(),
      String(doc.jobStatus || "").trim(),
      String(doc.preparedBy || "").trim(),
      formatReportDate(day, currency),
      formatReportDate(doc.dueDate, currency),
      formatReportDate(doc.proposalSubmitDate, currency),
      formatReportDate(doc.proposalAcceptedDate, currency),
      moneyCell(money.scopeTotal),
      moneyCell(money.otherTotal),
      moneyCell(money.taxAmount),
      moneyCell(money.grandTotal),
    ]);
  }
  return finalizeReport("Jobs pipeline", headers, rows, "jobs-pipeline", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildInvoicesAr(ownerEmail, from, to, currency, filters, reportOpts = {}) {
  const docs = await loadServiceProposals(ownerEmail);
  const paymentFilter = String(filters.payment || "").toLowerCase();
  const headers = [
    "Invoice #",
    "Customer",
    "Status",
    "Payment status",
    "Date created",
    "Invoice submit date",
    "Invoice paid date",
    "Due date",
    "Scope total",
    "Other items",
    "Tax",
    "Grand total",
    "Paid",
    "Unpaid",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    if (!isInvoiceSp(doc)) continue;
    const day = resolveDocDay(doc, ["dateCreated", "invoiceSubmitDate", "date", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    const money = computeSpInvoiceMoney(doc);
    if (paymentFilter === "paid" && !money.isPaid) continue;
    if (paymentFilter === "unpaid" && money.isPaid) continue;
    pushReportRow(rows, sortKeys, day, [
      String(doc.documentNumber || doc.quote || "").trim(),
      String(doc.companyName || "").trim(),
      String(doc.status || "").trim(),
      money.paymentStatus,
      formatReportDate(day, currency),
      formatReportDate(doc.invoiceSubmitDate, currency),
      formatReportDate(money.latestPaymentDate || doc.invoicePaidDate, currency),
      formatReportDate(doc.dueDate, currency),
      moneyCell(money.scopeTotal),
      moneyCell(money.otherTotal),
      moneyCell(money.taxAmount),
      moneyCell(money.grandTotal),
      moneyCell(money.amountPaid),
      moneyCell(money.unpaid),
    ]);
  }
  return finalizeReport("Invoices AR", headers, rows, "invoices-ar", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildPurchaseAp(ownerEmail, from, to, currency, filters, reportOpts = {}) {
  const docs = await loadPurchaseOrders(ownerEmail);
  const poTypeFilter = String(filters.poType || "").toLowerCase();
  const paymentFilter = String(filters.payment || "").trim();
  const receivingFilter = String(filters.receiving || "").trim();
  const headers = [
    "PO #",
    "Type",
    "Vendor",
    "Job #",
    "PO status",
    "Payment status",
    "PO date",
    "Due date",
    "Grand total",
    "Paid",
    "Unpaid",
    "Last payment date",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    if (poTypeFilter && resolveSimplePoType(doc) !== poTypeFilter) continue;
    const money = computePoMoney(doc);
    if (paymentFilter && money.paymentStatus !== paymentFilter) continue;
    if (receivingFilter && money.poStatus !== receivingFilter) continue;
    pushReportRow(rows, sortKeys, day, [
      String(doc.poNumber || "").trim(),
      money.poTypeLabel,
      String(doc.vendorName || "").trim(),
      String(doc.jobNumber || "").trim(),
      money.poStatus,
      money.paymentStatus,
      formatReportDate(day, currency),
      formatReportDate(doc.dueDate, currency),
      moneyCell(money.grandTotal),
      moneyCell(money.amountPaid),
      moneyCell(money.unpaid),
      formatReportDate(money.latestPaymentDate, currency),
    ]);
  }
  return finalizeReport("Purchase AP", headers, rows, "purchase-ap", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildVendorSpend(ownerEmail, from, to, filters, reportOpts = {}) {
  const docs = await loadPurchaseOrders(ownerEmail);
  const poTypeFilter = String(filters.poType || "").toLowerCase();
  const paymentFilter = String(filters.payment || "").trim();
  /** @type {Map<string, { vendor: string, count: number, ordered: number, paid: number, unpaid: number }>} */
  const map = new Map();
  for (const doc of docs) {
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    if (poTypeFilter && resolveSimplePoType(doc) !== poTypeFilter) continue;
    const money = computePoMoney(doc);
    if (paymentFilter && money.paymentStatus !== paymentFilter) continue;
    const key =
      String(doc.vendorId || "").trim() ||
      String(doc.vendorName || "").trim().toLowerCase() ||
      "unknown";
    const vendor = String(doc.vendorName || "").trim() || "—";
    const prev = map.get(key) || { vendor, count: 0, ordered: 0, paid: 0, unpaid: 0 };
    prev.count += 1;
    prev.ordered += money.grandTotal;
    prev.paid += money.amountPaid;
    prev.unpaid += money.unpaid;
    if (!prev.vendor || prev.vendor === "—") prev.vendor = vendor;
    map.set(key, prev);
  }
  const headers = ["Vendor", "PO count", "Ordered total", "Paid", "Unpaid"];
  const rows = Array.from(map.values())
    .sort((a, b) => b.ordered - a.ordered)
    .map((r) => [
      r.vendor,
      r.count,
      moneyCell(r.ordered),
      moneyCell(r.paid),
      moneyCell(r.unpaid),
    ]);
  return finalizeReport("Vendor spend", headers, rows, "vendor-spend", reportOpts);
}

async function buildInventoryStock(ownerEmail, filters, reportOpts = {}) {
  const docs = await InventoryItem.find({ createdByEmail: ownerEmail })
    .sort({ name: 1 })
    .limit(FETCH_LIMIT)
    .lean();
  const stockFilter = String(filters.stock || "").toLowerCase();
  const headers = [
    "Part",
    "SKU",
    "UOM",
    "Location",
    "On hand",
    "Reserved",
    "Available",
    "Threshold",
    "Low stock",
  ];
  const rows = [];
  for (const doc of docs) {
    const onHand = Number(doc.onHand) || 0;
    const reserved = Number(doc.reserved) || 0;
    const available = onHand - reserved;
    const threshold = Number(doc.threshold) || 0;
    const low = threshold > 0 && available <= threshold;
    if (stockFilter === "low" && !low) continue;
    if (stockFilter === "available" && available <= 0) continue;
    if (stockFilter === "zero" && available !== 0) continue;
    rows.push([
      String(doc.name || "").trim(),
      String(doc.sku || "").trim(),
      String(doc.uom || "").trim(),
      String(doc.location || "").trim(),
      onHand,
      reserved,
      available,
      threshold,
      boolLabel(low),
    ]);
  }
  return finalizeReport("Inventory stock", headers, rows, "inventory-stock", reportOpts);
}

async function buildCustomers(ownerEmail, filters, reportOpts = {}) {
  const docs = await Customer.find({ createdByEmail: ownerEmail })
    .sort({ createdAt: -1 })
    .limit(FETCH_LIMIT)
    .lean();
  const taxFilter = String(filters.taxExempt || "").toLowerCase();
  const headers = [
    "Company",
    "Contact",
    "Phone",
    "Email",
    "City",
    "State",
    "Credit limit",
    "Tax exempt",
    "Tax %",
    "EIN",
    "Created",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    const exempt = !!doc.taxExempt;
    if (taxFilter === "yes" && !exempt) continue;
    if (taxFilter === "no" && exempt) continue;
    pushReportRow(rows, sortKeys, doc.createdAt, [
      String(doc.companyName || "").trim(),
      String(doc.primaryContactName || "").trim(),
      String(doc.phone || "").trim(),
      String(doc.email || "").trim(),
      String(doc.city || "").trim(),
      String(doc.state || "").trim(),
      String(doc.creditLimit || "").trim(),
      boolLabel(exempt),
      String(doc.taxPercent ?? "0").trim(),
      String(doc.ein || "").trim(),
      formatReportDate(doc.createdAt, "USD"),
    ]);
  }
  return finalizeReport("Customers", headers, rows, "customers", {
    ...reportOpts,
    rowSortKeys: sortKeys,
    defaultSortColumn: 10,
  });
}

async function buildSalesCommissions(ownerEmail, from, to, currency, filters, reportOpts = {}) {
  const [serviceProposals, salesPeople] = await Promise.all([
    SimpleServiceProposal.find({ createdByEmail: ownerEmail })
      .select("_id documentNumber quote companyName recordType status")
      .lean(),
    SalesPerson.find({ createdByEmail: ownerEmail }).select("_id name email phone").lean(),
  ]);

  const spById = new Map();
  for (const sp of serviceProposals) {
    spById.set(String(sp._id), sp);
  }
  const simpleQuoteIds = Array.from(spById.keys());
  if (simpleQuoteIds.length === 0) {
    return finalizeReport(
      "Sales commissions",
      ["Job #", "Customer", "Sales person", "Amount", "Status", "Paid date", "Notes", "Created"],
      [],
      "sales-commissions",
      reportOpts
    );
  }

  const commissions = await SalesCommission.find({
    createdByEmail: ownerEmail,
    quoteId: { $in: simpleQuoteIds },
  })
    .sort({ createdAt: -1 })
    .limit(FETCH_LIMIT)
    .lean();

  const nameById = {};
  for (const sp of salesPeople) {
    nameById[String(sp._id)] = sp.name || sp.email || sp.phone || String(sp._id);
  }

  const statusFilter = String(filters.status || "").toLowerCase();
  const headers = [
    "Job #",
    "Customer",
    "Sales person",
    "Amount",
    "Status",
    "Paid date",
    "Notes",
    "Created",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of commissions) {
    const quoteId = String(doc.quoteId || "").trim();
    const linkedSp = spById.get(quoteId);
    if (!linkedSp) continue;

    const inCreated = dayInRange(doc.createdAt, from, to);
    const inPaid = dayInRange(doc.paidAt, from, to);
    if (!inCreated && !inPaid) continue;
    const isPaid = String(doc.status || "unpaid").toLowerCase() === "paid";
    if (statusFilter === "paid" && !isPaid) continue;
    if (statusFilter === "unpaid" && isPaid) continue;

    const jobNumber =
      String(linkedSp.documentNumber || linkedSp.quote || "").trim() ||
      String(doc.jobNumber || doc.rfqNumber || "").trim();

    pushReportRow(rows, sortKeys, doc.createdAt, [
      jobNumber,
      String(linkedSp.companyName || "").trim(),
      nameById[String(doc.salesPersonId)] || "",
      moneyCell(Number(doc.amount) || 0),
      isPaid ? "Paid" : "Unpaid",
      formatReportDate(doc.paidAt, currency),
      String(doc.notes || "").trim(),
      formatReportDate(doc.createdAt, currency),
    ]);
  }
  return finalizeReport("Sales commissions", headers, rows, "sales-commissions", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildSalesTax(ownerEmail, from, to, currency, filters, reportOpts = {}) {
  const docs = await loadServiceProposals(ownerEmail);
  const collectionFilter = String(filters.collection || "").toLowerCase();
  const headers = [
    "Invoice #",
    "Customer",
    "Status",
    "Invoice date",
    "Paid date",
    "Taxable base",
    "Tax %",
    "Tax amount",
    "Grand total",
    "Tax status",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    if (!isInvoiceSp(doc)) continue;
    if (doc.customerTaxExempt !== false) continue;
    const money = computeSpInvoiceMoney(doc);
    if (money.taxAmount <= 0) continue;
    const day = resolveDocDay(doc, ["invoiceSubmitDate", "dateCreated", "date", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    const taxStatus = money.isPaid ? "Collected" : "Outstanding";
    if (collectionFilter === "collected" && !money.isPaid) continue;
    if (collectionFilter === "outstanding" && money.isPaid) continue;
    const taxPct = parseMoneyInput(doc.taxPercent);
    pushReportRow(rows, sortKeys, day, [
      String(doc.documentNumber || doc.quote || "").trim(),
      String(doc.companyName || "").trim(),
      String(doc.status || "").trim(),
      formatReportDate(day, currency),
      formatReportDate(money.latestPaymentDate || doc.invoicePaidDate, currency),
      moneyCell(money.scopeTotal),
      moneyCell(taxPct),
      moneyCell(money.taxAmount),
      moneyCell(money.grandTotal),
      taxStatus,
    ]);
  }
  return finalizeReport("Sales tax", headers, rows, "sales-tax", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildPurchaseTax(ownerEmail, from, to, currency, filters, reportOpts = {}) {
  const docs = await loadPurchaseOrders(ownerEmail);
  const poTypeFilter = String(filters.poType || "").toLowerCase();
  const headers = [
    "PO #",
    "Type",
    "Vendor",
    "Job #",
    "PO date",
    "Line total",
    "Tax",
    "Grand total",
    "Payment status",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    if (poTypeFilter && resolveSimplePoType(doc) !== poTypeFilter) continue;
    const money = computePoMoney(doc);
    if (money.taxAmount <= 0) continue;
    pushReportRow(rows, sortKeys, day, [
      String(doc.poNumber || "").trim(),
      money.poTypeLabel,
      String(doc.vendorName || "").trim(),
      String(doc.jobNumber || "").trim(),
      formatReportDate(day, currency),
      moneyCell(money.lineTotal),
      moneyCell(money.taxAmount),
      moneyCell(money.grandTotal),
      money.paymentStatus,
    ]);
  }
  return finalizeReport("Purchase tax", headers, rows, "purchase-tax", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildArAging(ownerEmail, currency, filters, reportOpts = {}) {
  const docs = await loadServiceProposals(ownerEmail);
  const bucketFilter = String(filters.bucket || "").trim();
  const headers = [
    "Invoice #",
    "Customer",
    "Status",
    "Payment status",
    "Invoice date",
    "Due date",
    "Days past due",
    "Aging bucket",
    "Grand total",
    "Unpaid",
    "Tax",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    if (!isInvoiceSp(doc)) continue;
    const money = computeSpInvoiceMoney(doc);
    if (money.unpaid <= 0) continue;
    const aging = agingFromDueDate(doc.dueDate);
    if (bucketFilter && aging.bucket !== bucketFilter) continue;
    const day = resolveDocDay(doc, ["invoiceSubmitDate", "dateCreated", "date", "createdAt"]);
    pushReportRow(rows, sortKeys, day, [
      String(doc.documentNumber || doc.quote || "").trim(),
      String(doc.companyName || "").trim(),
      String(doc.status || "").trim(),
      money.paymentStatus,
      formatReportDate(day, currency),
      formatReportDate(doc.dueDate, currency),
      aging.daysPastDue == null ? "" : aging.daysPastDue,
      agingBucketLabel(aging.bucket),
      moneyCell(money.grandTotal),
      moneyCell(money.unpaid),
      moneyCell(money.taxAmount),
    ]);
  }
  return finalizeReport("AR aging", headers, rows, "ar-aging", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildApAging(ownerEmail, currency, filters, reportOpts = {}) {
  const docs = await loadPurchaseOrders(ownerEmail);
  const bucketFilter = String(filters.bucket || "").trim();
  const headers = [
    "PO #",
    "Type",
    "Vendor",
    "Job #",
    "PO date",
    "Due date",
    "Days past due",
    "Aging bucket",
    "Grand total",
    "Unpaid",
    "Payment status",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    const money = computePoMoney(doc);
    if (money.unpaid <= 0) continue;
    const aging = agingFromDueDate(doc.dueDate);
    if (bucketFilter && aging.bucket !== bucketFilter) continue;
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    pushReportRow(rows, sortKeys, day, [
      String(doc.poNumber || "").trim(),
      money.poTypeLabel,
      String(doc.vendorName || "").trim(),
      String(doc.jobNumber || "").trim(),
      formatReportDate(day, currency),
      formatReportDate(doc.dueDate, currency),
      aging.daysPastDue == null ? "" : aging.daysPastDue,
      agingBucketLabel(aging.bucket),
      moneyCell(money.grandTotal),
      moneyCell(money.unpaid),
      money.paymentStatus,
    ]);
  }
  return finalizeReport("AP aging", headers, rows, "ap-aging", { ...reportOpts, rowSortKeys: sortKeys });
}

async function buildCashReceipts(ownerEmail, from, to, currency, reportOpts = {}) {
  const docs = await loadServiceProposals(ownerEmail);
  const headers = [
    "Invoice #",
    "Customer",
    "Paid date",
    "Method",
    "Reference",
    "Notes",
    "Invoice date",
    "Amount received",
  ];
  const rows = [];
  const sortKeys = [];
  for (const doc of docs) {
    if (!isInvoiceSp(doc)) continue;
    const invoiceDay = resolveDocDay(doc, ["invoiceSubmitDate", "dateCreated", "date", "createdAt"]);
    const invoiceNo = String(doc.documentNumber || doc.quote || "").trim();
    const customer = String(doc.companyName || "").trim();
    const payments = normalizeInvoicePayments(doc.payments);
    if (payments.length > 0) {
      for (const payment of payments) {
        const amount = parseMoneyInput(payment.amount);
        if (amount <= 0) continue;
        const paidDay = toYmd(payment.date);
        if (!dayInRange(paidDay, from, to)) continue;
        pushReportRow(rows, sortKeys, paidDay, [
          invoiceNo,
          customer,
          formatReportDate(paidDay, currency),
          String(payment.method || "").trim(),
          String(payment.reference || "").trim(),
          String(payment.notes || "").trim(),
          formatReportDate(invoiceDay, currency),
          moneyCell(amount),
        ]);
      }
      continue;
    }

    // Legacy invoices with only invoicePaidDate / paid status (no payments[] rows).
    if (!isSpInvoicePaid(doc)) continue;
    const money = computeSpMoney(doc);
    if (money.grandTotal <= 0) continue;
    const paidDay = toYmd(doc.invoicePaidDate) || resolveDocDay(doc, ["invoicePaidDate", "updatedAt"]);
    if (!dayInRange(paidDay, from, to)) continue;
    pushReportRow(rows, sortKeys, paidDay, [
      invoiceNo,
      customer,
      formatReportDate(paidDay, currency),
      "",
      "",
      "",
      formatReportDate(invoiceDay, currency),
      moneyCell(money.grandTotal),
    ]);
  }
  return finalizeReport("Cash receipts", headers, rows, "cash-receipts", { ...reportOpts, rowSortKeys: sortKeys });
}

function fileStamp() {
  return toYmd(new Date()) || "export";
}
