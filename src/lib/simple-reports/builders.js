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
import { buildSimpleReportWorkbook } from "@/lib/simple-reports/workbook";
import { isValidSimpleReportId } from "@/lib/simple-reports/catalog";
import { normalizeInvoicePayments, parseMoneyInput } from "@/lib/simple-service-proposal-form";

const FETCH_LIMIT = 20000;

/**
 * @param {{
 *   report: string,
 *   ownerEmail: string,
 *   from?: string,
 *   to?: string,
 *   filters?: Record<string, string>,
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
  const currency = await loadOwnerCurrency(ownerEmail);

  switch (report) {
    case "jobs-pipeline":
      return buildJobsPipeline(ownerEmail, from, to, currency, filters);
    case "invoices-ar":
      return buildInvoicesAr(ownerEmail, from, to, currency, filters);
    case "purchase-ap":
      return buildPurchaseAp(ownerEmail, from, to, currency, filters);
    case "vendor-spend":
      return buildVendorSpend(ownerEmail, from, to, filters);
    case "inventory-stock":
      return buildInventoryStock(ownerEmail, filters);
    case "customers":
      return buildCustomers(ownerEmail, filters);
    case "sales-commissions":
      return buildSalesCommissions(ownerEmail, from, to, currency, filters);
    case "sales-tax":
      return buildSalesTax(ownerEmail, from, to, currency, filters);
    case "purchase-tax":
      return buildPurchaseTax(ownerEmail, from, to, currency, filters);
    case "ar-aging":
      return buildArAging(ownerEmail, currency, filters);
    case "ap-aging":
      return buildApAging(ownerEmail, currency, filters);
    case "cash-receipts":
      return buildCashReceipts(ownerEmail, from, to, currency);
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

async function buildJobsPipeline(ownerEmail, from, to, currency, filters) {
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
  for (const doc of docs) {
    if (!isPipelineSp(doc)) continue;
    const recordType = String(doc.recordType || "RFQ").toUpperCase();
    if (typeFilter && recordType !== typeFilter) continue;
    if (!matchPipelineStatusBucket(doc.status, statusBucket)) continue;
    const day = resolveDocDay(doc, ["dateCreated", "date", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    const money = computeSpMoney(doc);
    rows.push([
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
  const buffer = await buildSimpleReportWorkbook("Jobs pipeline", headers, rows);
  return { buffer, filename: `jobs-pipeline-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildInvoicesAr(ownerEmail, from, to, currency, filters) {
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
  for (const doc of docs) {
    if (!isInvoiceSp(doc)) continue;
    const day = resolveDocDay(doc, ["dateCreated", "invoiceSubmitDate", "date", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    const money = computeSpInvoiceMoney(doc);
    if (paymentFilter === "paid" && !money.isPaid) continue;
    if (paymentFilter === "unpaid" && money.isPaid) continue;
    rows.push([
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
  const buffer = await buildSimpleReportWorkbook("Invoices AR", headers, rows);
  return { buffer, filename: `invoices-ar-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildPurchaseAp(ownerEmail, from, to, currency, filters) {
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
  for (const doc of docs) {
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    if (poTypeFilter && resolveSimplePoType(doc) !== poTypeFilter) continue;
    const money = computePoMoney(doc);
    if (paymentFilter && money.paymentStatus !== paymentFilter) continue;
    if (receivingFilter && money.poStatus !== receivingFilter) continue;
    rows.push([
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
  const buffer = await buildSimpleReportWorkbook("Purchase AP", headers, rows);
  return { buffer, filename: `purchase-ap-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildVendorSpend(ownerEmail, from, to, filters) {
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
  const buffer = await buildSimpleReportWorkbook("Vendor spend", headers, rows);
  return { buffer, filename: `vendor-spend-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildInventoryStock(ownerEmail, filters) {
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
  const buffer = await buildSimpleReportWorkbook("Inventory stock", headers, rows);
  return { buffer, filename: `inventory-stock-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildCustomers(ownerEmail, filters) {
  const docs = await Customer.find({ createdByEmail: ownerEmail })
    .sort({ companyName: 1 })
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
  ];
  const rows = [];
  for (const doc of docs) {
    const exempt = !!doc.taxExempt;
    if (taxFilter === "yes" && !exempt) continue;
    if (taxFilter === "no" && exempt) continue;
    rows.push([
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
    ]);
  }
  const buffer = await buildSimpleReportWorkbook("Customers", headers, rows);
  return { buffer, filename: `customers-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildSalesCommissions(ownerEmail, from, to, currency, filters) {
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
    const buffer = await buildSimpleReportWorkbook(
      "Sales commissions",
      ["Job #", "Customer", "Sales person", "Amount", "Status", "Paid date", "Notes", "Created"],
      []
    );
    return { buffer, filename: `sales-commissions-${fileStamp()}.xlsx`, rowCount: 0 };
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

    rows.push([
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
  const buffer = await buildSimpleReportWorkbook("Sales commissions", headers, rows);
  return { buffer, filename: `sales-commissions-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildSalesTax(ownerEmail, from, to, currency, filters) {
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
    rows.push([
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
  const buffer = await buildSimpleReportWorkbook("Sales tax", headers, rows);
  return { buffer, filename: `sales-tax-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildPurchaseTax(ownerEmail, from, to, currency, filters) {
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
  for (const doc of docs) {
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    if (!dayInRange(day, from, to)) continue;
    if (poTypeFilter && resolveSimplePoType(doc) !== poTypeFilter) continue;
    const money = computePoMoney(doc);
    if (money.taxAmount <= 0) continue;
    rows.push([
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
  const buffer = await buildSimpleReportWorkbook("Purchase tax", headers, rows);
  return { buffer, filename: `purchase-tax-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildArAging(ownerEmail, currency, filters) {
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
  for (const doc of docs) {
    if (!isInvoiceSp(doc)) continue;
    const money = computeSpInvoiceMoney(doc);
    if (money.unpaid <= 0) continue;
    const aging = agingFromDueDate(doc.dueDate);
    if (bucketFilter && aging.bucket !== bucketFilter) continue;
    const day = resolveDocDay(doc, ["invoiceSubmitDate", "dateCreated", "date", "createdAt"]);
    rows.push([
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
  rows.sort((a, b) => {
    const da = typeof a[6] === "number" ? a[6] : -99999;
    const db = typeof b[6] === "number" ? b[6] : -99999;
    return db - da;
  });
  const buffer = await buildSimpleReportWorkbook("AR aging", headers, rows);
  return { buffer, filename: `ar-aging-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildApAging(ownerEmail, currency, filters) {
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
  for (const doc of docs) {
    const money = computePoMoney(doc);
    if (money.unpaid <= 0) continue;
    const aging = agingFromDueDate(doc.dueDate);
    if (bucketFilter && aging.bucket !== bucketFilter) continue;
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    rows.push([
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
  rows.sort((a, b) => {
    const da = typeof a[6] === "number" ? a[6] : -99999;
    const db = typeof b[6] === "number" ? b[6] : -99999;
    return db - da;
  });
  const buffer = await buildSimpleReportWorkbook("AP aging", headers, rows);
  return { buffer, filename: `ap-aging-${fileStamp()}.xlsx`, rowCount: rows.length };
}

async function buildCashReceipts(ownerEmail, from, to, currency) {
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
        rows.push([
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
    rows.push([
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
  const buffer = await buildSimpleReportWorkbook("Cash receipts", headers, rows);
  return { buffer, filename: `cash-receipts-${fileStamp()}.xlsx`, rowCount: rows.length };
}

function fileStamp() {
  return toYmd(new Date()) || "export";
}
