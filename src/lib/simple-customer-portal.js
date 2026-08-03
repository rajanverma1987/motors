/**
 * Map SimpleServiceProposal docs into the public customer portal payload.
 */

import {
  RECORD_TYPE_INVOICE,
  RECORD_TYPE_JOB,
  RECORD_TYPE_RFQ,
  parseMoneyInput,
  recordTypeDocumentLabel,
  sumLinePrices,
} from "@/lib/simple-service-proposal-form";
import { matchPipelineStatusBucket } from "@/lib/simple-reports/helpers";
import {
  PRINT_NOTES_CUSTOMER,
  buildSimpleServiceProposalPrintBundle,
} from "@/lib/simple-service-proposal-print";

function moneyFixed(n) {
  const value = Number.isFinite(n) ? n : 0;
  return (Math.round(value * 100) / 100).toFixed(2);
}

function mapAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((a) => ({
      url: String(a?.url ?? "").trim(),
      name: String(a?.name ?? "").trim() || "Attachment",
    }))
    .filter((a) => a.url);
}

function mapScopeLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      description: String(row?.description ?? row?.scope ?? "").trim(),
      price: String(row?.price ?? "").trim(),
    }))
    .filter((row) => row.description || row.price);
}

function mapOtherLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      description: String(row?.description ?? row?.item ?? "").trim(),
      qty: String(row?.qty ?? "").trim() || "1",
      uom: String(row?.uom ?? "").trim(),
      price: String(row?.price ?? "").trim(),
    }))
    .filter((row) => row.description || row.price);
}

function motorLabelFromSp(doc) {
  return [doc?.manufacturer, doc?.modelNumber, doc?.hpKw, doc?.volts].filter(Boolean).join(" · ") || "";
}

function computeSpTotals(doc) {
  const scopeTotal = sumLinePrices(doc?.scopeDetails);
  const otherTotal = sumLinePrices(doc?.otherItems);
  const showTax = doc?.customerTaxExempt === false;
  const taxPct = showTax ? parseMoneyInput(doc?.taxPercent) : 0;
  const taxAmount = showTax ? (scopeTotal * taxPct) / 100 : 0;
  const subtotal = scopeTotal + otherTotal;
  const grandTotal = subtotal + taxAmount;
  return { scopeTotal, otherTotal, subtotal, taxAmount, grandTotal };
}

function isInvoiceDoc(doc) {
  return String(doc?.recordType || "").toUpperCase() === RECORD_TYPE_INVOICE;
}

function isPipelineDoc(doc) {
  const t = String(doc?.recordType || RECORD_TYPE_RFQ).toUpperCase();
  return t === RECORD_TYPE_RFQ || t === RECORD_TYPE_JOB;
}

function invoiceIsPaid(doc) {
  const paidDate = String(doc?.invoicePaidDate || "").trim();
  return Boolean(paidDate) || /paid/i.test(String(doc?.status || ""));
}

/**
 * @param {Record<string, unknown>} doc
 */
export function mapSimpleSpForPortal(doc) {
  const recordType = String(doc?.recordType || RECORD_TYPE_RFQ).toUpperCase();
  const money = computeSpTotals(doc);
  const status = String(doc?.status || "").trim();
  const jobStatus = String(doc?.jobStatus || "").trim();
  const closed = matchPipelineStatusBucket(status, "closed");
  const paid = isInvoiceDoc(doc) && invoiceIsPaid(doc);

  return {
    id: String(doc?._id || doc?.id || ""),
    recordType,
    documentNumber: String(doc?.documentNumber || doc?.quote || "").trim(),
    documentLabel: recordTypeDocumentLabel(recordType),
    title:
      recordType === RECORD_TYPE_INVOICE
        ? "Invoice"
        : recordType === RECORD_TYPE_JOB
          ? "Job"
          : "Service proposal",
    customerPo: String(doc?.customerPo || "").trim(),
    dateCreated: String(doc?.dateCreated || "").trim(),
    dueDate: String(doc?.dueDate || "").trim(),
    proposalSubmitDate: String(doc?.proposalSubmitDate || "").trim(),
    proposalAcceptedDate: String(doc?.proposalAcceptedDate || "").trim(),
    invoiceSubmitDate: String(doc?.invoiceSubmitDate || "").trim(),
    invoicePaidDate: String(doc?.invoicePaidDate || "").trim(),
    status,
    jobStatus,
    motorLabel: motorLabelFromSp(doc),
    manufacturer: String(doc?.manufacturer || "").trim(),
    modelNumber: String(doc?.modelNumber || "").trim(),
    hpKw: String(doc?.hpKw || "").trim(),
    frameType: String(doc?.frameType || "").trim(),
    volts: String(doc?.volts || "").trim(),
    amps: String(doc?.amps || "").trim(),
    rpm: String(doc?.rpm || "").trim(),
    customerNotes: String(doc?.customerNotes || "").trim(),
    scopeLines: mapScopeLines(doc?.scopeDetails),
    otherLines: mapOtherLines(doc?.otherItems),
    scopeTotal: moneyFixed(money.scopeTotal),
    otherTotal: moneyFixed(money.otherTotal),
    subtotal: moneyFixed(money.subtotal),
    taxAmount: moneyFixed(money.taxAmount),
    grandTotal: moneyFixed(money.grandTotal),
    attachments: mapAttachments(doc?.attachments),
    isPaid: paid,
    isClosed: closed,
    outcomeLabel: closed ? status || "Closed" : "",
  };
}

/**
 * Derive unique motor cards from Simple SP motor fields.
 * @param {Record<string, unknown>[]} docs
 */
export function deriveMotorsFromSimpleSps(docs) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const doc of docs || []) {
    const manufacturer = String(doc?.manufacturer || "").trim();
    const modelNumber = String(doc?.modelNumber || "").trim();
    const hpKw = String(doc?.hpKw || "").trim();
    const frameType = String(doc?.frameType || "").trim();
    const volts = String(doc?.volts || "").trim();
    const amps = String(doc?.amps || "").trim();
    const rpm = String(doc?.rpm || "").trim();
    if (![manufacturer, modelNumber, hpKw, frameType, volts, amps, rpm].some(Boolean)) continue;
    const key = [manufacturer, modelNumber, hpKw, frameType, volts, rpm].join("|").toLowerCase();
    if (map.has(key)) continue;
    map.set(key, {
      id: key || String(doc?._id || Math.random()),
      manufacturer,
      modelNumber,
      hpKw,
      frameType,
      volts,
      amps,
      rpm,
      motorPaint: String(doc?.motorPaint || "").trim(),
    });
  }
  return Array.from(map.values());
}

/**
 * @param {Record<string, unknown>[]} docs lean SimpleServiceProposal docs
 * @param {{
 *   customer?: object | null,
 *   accountSettings?: object,
 *   user?: object | null,
 *   employees?: object[],
 * }} [printContext]
 */
export function buildSimplePortalPayload(docs, printContext = {}) {
  const customer = printContext.customer || null;
  const accountSettings = printContext.accountSettings || {};
  const user = printContext.user || null;
  const employees = Array.isArray(printContext.employees) ? printContext.employees : [];

  const mapped = (Array.isArray(docs) ? docs : [])
    .map((doc) => {
      const card = mapSimpleSpForPortal(doc);
      if (!card.id) return null;
      const printBundle = buildSimpleServiceProposalPrintBundle({
        form: doc,
        customer,
        employees,
        accountSettings,
        user,
        notesMode: PRINT_NOTES_CUSTOMER,
      });
      return { ...card, printBundle };
    })
    .filter(Boolean);

  const pipeline = mapped.filter((d) => {
    const t = d.recordType;
    return t === RECORD_TYPE_RFQ || t === RECORD_TYPE_JOB;
  });
  const repairsInProgress = pipeline.filter((d) => !d.isClosed);
  const repairHistory = pipeline.filter((d) => d.isClosed);
  const invoices = mapped.filter((d) => d.recordType === RECORD_TYPE_INVOICE);
  const motors = deriveMotorsFromSimpleSps(docs);

  return {
    motors,
    repairsInProgress,
    repairHistory,
    invoices,
  };
}
