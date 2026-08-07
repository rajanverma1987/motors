/** Empty / initial shape for Simple portal service proposal form. */

import { toInputDateValue } from "@/lib/format-date";

export const RECORD_TYPE_RFQ = "RFQ";
export const RECORD_TYPE_JOB = "JOB";
export const RECORD_TYPE_INVOICE = "INVOICE";

export const RECORD_TYPES = [RECORD_TYPE_RFQ, RECORD_TYPE_JOB, RECORD_TYPE_INVOICE];

export const QUOTE_TYPE_VALUES = ["Phone", "Email", "Walk-in", "Other"];

function normalizeQuoteTypeValue(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  const hit = QUOTE_TYPE_VALUES.find((q) => q.toLowerCase() === t.toLowerCase());
  return hit || t;
}

export function emptyScopeLine() {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `scope-${Date.now()}`,
    description: "",
    price: "",
  };
}

export function emptyOtherLine() {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `other-${Date.now()}`,
    description: "",
    uom: "",
    price: "",
    /** Optional — set when added from Inventory lookup */
    qty: "",
    inventoryItemId: "",
  };
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyServiceProposalForm(overrides = {}) {
  return {
    customerId: "",
    customerEmail: "",
    customerPhone: "",
    customerTaxExempt: true,
    motorPower: "AC",
    namePlate: "Original",
    manufacturer: "",
    hpKw: "",
    frameType: "",
    modelNumber: "",
    volts: "",
    amps: "",
    rpm: "",
    sl: "",
    cl: "",
    cd: "",
    bars: "",
    motorPaint: "",
    acDatasheet: null,
    dcDatasheet: null,
    internalNotes: "",
    customerNotes: "",
    customerPo: "",
    /** Motor shipping PO override (distinct from customerPo) */
    shippingPo: "",
    dateCreated: todayISODate(),
    preparedBy: "",
    documentNumber: "",
    recordType: RECORD_TYPE_RFQ,
    proposalApprovedBy: "",
    quoteType: "",
    dueDate: "",
    proposalSubmitDate: "",
    proposalAcceptedDate: "",
    invoiceSubmitDate: "",
    invoicePaidDate: "",
    jobStatus: "",
    status: "",
    taxPercent: "",
    scopeDetails: [emptyScopeLine()],
    otherItems: [emptyOtherLine()],
    attachments: [],
    ...overrides,
  };
}

function newLineId(prefix) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Deep-ish clone of a form for "Copy & Create New":
 * new RFQ with empty document # / id / attachments; line item ids regenerated.
 * @param {Record<string, unknown>} form
 */
export function cloneServiceProposalAsNewRfq(form) {
  const source = form && typeof form === "object" ? form : {};
  const scopeDetails = Array.isArray(source.scopeDetails)
    ? source.scopeDetails.map((line) => ({ ...line, id: newLineId("scope") }))
    : [emptyScopeLine()];
  const otherItems = Array.isArray(source.otherItems)
    ? source.otherItems.map((line) => ({ ...line, id: newLineId("other") }))
    : [emptyOtherLine()];

  const {
    id: _id,
    quote: _quote,
    updatedAt: _updatedAt,
    ...rest
  } = source;

  return {
    ...createEmptyServiceProposalForm(),
    ...rest,
    id: "",
    documentNumber: "",
    quote: "",
    recordType: RECORD_TYPE_RFQ,
    attachments: [],
    acDatasheet: source.acDatasheet && typeof source.acDatasheet === "object" ? { ...source.acDatasheet } : null,
    dcDatasheet: source.dcDatasheet && typeof source.dcDatasheet === "object" ? { ...source.dcDatasheet } : null,
    scopeDetails,
    otherItems,
  };
}

export function sumLinePrices(lines) {
  if (!Array.isArray(lines)) return 0;
  return lines.reduce((sum, line) => {
    const n = Number.parseFloat(String(line?.price ?? "").replace(/[^0-9.-]/g, ""));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** Display title for the form / modal heading. */
export function recordTypeDisplayTitle(recordType) {
  const t = String(recordType || RECORD_TYPE_RFQ).toUpperCase();
  if (t === RECORD_TYPE_INVOICE) return "INVOICE";
  return "SERVICE PROPOSAL";
}

/** Document number field label (RFQ# / JOB# / Invoice#). */
export function recordTypeDocumentLabel(recordType) {
  const t = String(recordType || RECORD_TYPE_RFQ).toUpperCase();
  if (t === RECORD_TYPE_INVOICE) return "Invoice#";
  if (t === RECORD_TYPE_JOB) return "JOB#";
  return "RFQ#";
}

/**
 * Resolve record type from Status.
 * Invoice only when Status is explicitly an invoice option (`invoice:` prefix)
 * or an invoice-only slug (not also a quote/RFQ status — avoids "Proposal Submitted" collisions).
 *
 * @param {string} currentType
 * @param {string} status
 * @param {Set<string>|string[]} invoiceStatusValues
 * @param {Set<string>|string[]} [quoteStatusValues]
 */
export function resolveRecordTypeOnSave(
  currentType,
  status,
  invoiceStatusValues,
  quoteStatusValues = []
) {
  const raw = String(status || "").trim();
  const statusKey = raw.toLowerCase();

  const toSet = (vals) =>
    vals instanceof Set
      ? vals
      : new Set(
          (Array.isArray(vals) ? vals : []).map((v) => String(v || "").trim().toLowerCase()).filter(Boolean)
        );

  const invoiceSet = toSet(invoiceStatusValues);
  const quoteSet = toSet(quoteStatusValues);

  if (statusKey.startsWith("invoice:")) return RECORD_TYPE_INVOICE;

  const bare = statusKey.replace(/^invoice:/, "");
  const isInvoiceOnly = Boolean(bare && invoiceSet.has(bare) && !quoteSet.has(bare));
  if (isInvoiceOnly) return RECORD_TYPE_INVOICE;

  const t = String(currentType || RECORD_TYPE_RFQ).toUpperCase();
  if (t === RECORD_TYPE_JOB) return RECORD_TYPE_JOB;
  if (t === RECORD_TYPE_INVOICE) return RECORD_TYPE_RFQ;
  return RECORD_TYPE_RFQ;
}

/** True when the list row should appear under the Invoices tab. */
export function isSimpleInvoiceRecord(row, invoiceStatusValues = [], quoteStatusValues = []) {
  if (String(row?.recordType || "").toUpperCase() === RECORD_TYPE_INVOICE) return true;
  const raw = String(row?.status || "").trim().toLowerCase();
  if (!raw) return false;
  if (raw.startsWith("invoice:")) return true;
  const bare = raw.replace(/^invoice:/, "");
  const invoiceSet = new Set(
    (Array.isArray(invoiceStatusValues) ? invoiceStatusValues : [])
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean)
  );
  const quoteSet = new Set(
    (Array.isArray(quoteStatusValues) ? quoteStatusValues : [])
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean)
  );
  return Boolean(bare && invoiceSet.has(bare) && !quoteSet.has(bare));
}

export function parseMoneyInput(value) {
  const n = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatSimpleMoney(n) {
  const value = Number.isFinite(n) ? n : 0;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Totals from scope / other lines (+ tax when customer is not tax-exempt). */
export function computeSimpleServiceProposalTotals(form) {
  const scopeTotal = sumLinePrices(form?.scopeDetails);
  const otherTotal = sumLinePrices(form?.otherItems);
  const subtotal = scopeTotal + otherTotal;
  const showTax = form?.customerTaxExempt === false;
  const taxPct = showTax ? parseMoneyInput(form?.taxPercent) : 0;
  const taxAmount = showTax ? (scopeTotal * taxPct) / 100 : 0;
  return {
    proposalTotal: subtotal,
    taxCollected: taxAmount,
    total: subtotal + taxAmount,
  };
}

function lineListHasMoney(lines) {
  return Array.isArray(lines) && lines.some((line) => String(line?.price ?? "").trim() !== "");
}

/**
 * Normalize a Mongo/API service-proposal doc (incl. CSV imports) into Service Proposals table shape.
 * Maps stored form fields onto list aliases (quote, date, phone, quotedBy, notes, totals, …).
 *
 * @param {Record<string, unknown>} doc
 * @param {{ companyName?: string, preparedByLabel?: string, phone?: string, email?: string, id?: string }|null} [meta]
 */
export function toSimpleServiceProposalListRow(doc, meta = null) {
  const form = doc && typeof doc === "object" ? doc : {};
  const m = meta && typeof meta === "object" ? meta : {};
  const documentNumber = String(form.documentNumber ?? form.quote ?? "").trim();
  const id =
    String(m.id || form.id || "").trim() ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sp-${Date.now()}`);

  const computed = computeSimpleServiceProposalTotals(form);
  const hasLineMoney =
    lineListHasMoney(form.scopeDetails) || lineListHasMoney(form.otherItems);
  const storedTotal = Number(form.total);
  const totals = hasLineMoney
    ? computed
    : {
        proposalTotal:
          Number.isFinite(Number(form.proposalTotal)) && Number(form.proposalTotal) !== 0
            ? Number(form.proposalTotal)
            : computed.proposalTotal,
        taxCollected:
          Number.isFinite(Number(form.taxCollected)) && Number(form.taxCollected) !== 0
            ? Number(form.taxCollected)
            : computed.taxCollected,
        total: Number.isFinite(storedTotal) && storedTotal !== 0 ? storedTotal : computed.total,
      };

  const phone =
    String(form.customerPhone || form.phone || m.phone || "").trim() || "";
  const email =
    String(form.customerEmail || form.email || m.email || "").trim() || "";

  return {
    ...form,
    id,
    documentNumber,
    quote: documentNumber,
    date: String(form.dateCreated || form.date || "").trim(),
    companyName: String(m.companyName || form.companyName || "").trim(),
    phone,
    email,
    customerPhone: String(form.customerPhone || phone).trim(),
    customerEmail: String(form.customerEmail || email).trim(),
    quotedBy: String(m.preparedByLabel || form.quotedBy || form.preparedBy || "").trim(),
    quoteType: String(form.quoteType || "").trim(),
    notes: String(form.notes || form.internalNotes || "").trim(),
    total: totals.total,
    proposalTotal: totals.proposalTotal,
    taxCollected: totals.taxCollected,
    submitDate: String(form.submitDate || form.proposalSubmitDate || "").trim(),
    acceptDate: String(form.acceptDate || form.proposalAcceptedDate || "").trim(),
    status: String(form.status || "").trim(),
    jobStatus: String(form.jobStatus || "").trim(),
    dueDate: String(form.dueDate || "").trim(),
    updatedAt: form.updatedAt || new Date().toISOString(),
  };
}

/**
 * Map form + display helpers into a list-row for the Service Proposals table.
 * Caller must set `documentNumber` (Classic job/RFQ series) before calling when creating.
 * @param {Record<string, unknown>} form
 * @param {{ companyName?: string, preparedByLabel?: string, approvedByLabel?: string, id?: string }} [meta]
 */
export function formToServiceProposalListRow(form, meta = {}) {
  return toSimpleServiceProposalListRow(form, {
    ...meta,
    companyName: meta.companyName || "",
    preparedByLabel: meta.preparedByLabel || "",
  });
}

/**
 * Hydrate the Service Proposal form from a list row or full API document.
 * Maps table aliases (date, notes, phone, …) back onto form fields and normalizes dates for date inputs.
 *
 * @param {Record<string, unknown>|null|undefined} doc
 */
export function simpleServiceProposalDocToForm(doc) {
  const d = doc && typeof doc === "object" ? doc : {};
  const base = createEmptyServiceProposalForm();
  const next = { ...base };

  for (const key of Object.keys(base)) {
    if (d[key] !== undefined && d[key] !== null) next[key] = d[key];
  }

  next.id = String(d.id || "").trim();
  next.customerId = String(d.customerId || "").trim();
  next.customerEmail = String(d.customerEmail || d.email || "").trim();
  next.customerPhone = String(d.customerPhone || d.phone || "").trim();
  next.customerTaxExempt = d.customerTaxExempt !== false;
  next.taxPercent = String(d.taxPercent ?? next.taxPercent ?? "").trim();
  next.motorPower = String(d.motorPower || "AC").toUpperCase() === "DC" ? "DC" : "AC";
  next.namePlate = String(d.namePlate || "Original").trim() || "Original";
  next.documentNumber = String(d.documentNumber || d.quote || "").trim();
  next.recordType = String(d.recordType || RECORD_TYPE_RFQ)
    .trim()
    .toUpperCase() || RECORD_TYPE_RFQ;
  next.status = String(d.status || "").trim();
  next.jobStatus = String(d.jobStatus || "").trim();
  next.preparedBy = String(d.preparedBy || "").trim();
  next.proposalApprovedBy = String(d.proposalApprovedBy || "").trim();
  next.quoteType = normalizeQuoteTypeValue(d.quoteType);
  next.customerPo = String(d.customerPo || "").trim();
  next.shippingPo = String(d.shippingPo || "").trim();
  next.internalNotes = String(d.internalNotes ?? d.notes ?? "").trim();
  next.customerNotes = String(d.customerNotes || "").trim();
  next.manufacturer = String(d.manufacturer || "").trim();
  next.hpKw = String(d.hpKw || "").trim();
  next.frameType = String(d.frameType || "").trim();
  next.modelNumber = String(d.modelNumber || "").trim();
  next.volts = String(d.volts || "").trim();
  next.amps = String(d.amps || "").trim();
  next.rpm = String(d.rpm || "").trim();
  next.sl = String(d.sl || "").trim();
  next.cl = String(d.cl || "").trim();
  next.cd = String(d.cd || "").trim();
  next.bars = String(d.bars || "").trim();
  next.motorPaint = String(d.motorPaint || "").trim();

  const hasId = Boolean(String(d.id || "").trim());
  const dateCreated = toInputDateValue(d.dateCreated || d.date);
  next.dateCreated = dateCreated || (hasId ? "" : base.dateCreated);
  next.dueDate = toInputDateValue(d.dueDate);
  next.proposalSubmitDate = toInputDateValue(d.proposalSubmitDate || d.submitDate);
  next.proposalAcceptedDate = toInputDateValue(d.proposalAcceptedDate || d.acceptDate);
  next.invoiceSubmitDate = toInputDateValue(d.invoiceSubmitDate);
  next.invoicePaidDate = toInputDateValue(d.invoicePaidDate);

  next.scopeDetails =
    Array.isArray(d.scopeDetails) && d.scopeDetails.length
      ? d.scopeDetails.map((line) => ({
          ...emptyScopeLine(),
          ...(line && typeof line === "object" ? line : {}),
          id: String(line?.id || "").trim() || emptyScopeLine().id,
          description: String(line?.description || "").trim(),
          price: String(line?.price ?? "").trim(),
        }))
      : [emptyScopeLine()];

  next.otherItems =
    Array.isArray(d.otherItems) && d.otherItems.length
      ? d.otherItems.map((line) => ({
          ...emptyOtherLine(),
          ...(line && typeof line === "object" ? line : {}),
          id: String(line?.id || "").trim() || emptyOtherLine().id,
          description: String(line?.description || "").trim(),
          uom: String(line?.uom || "").trim(),
          price: String(line?.price ?? "").trim(),
          qty: String(line?.qty ?? "").trim(),
          inventoryItemId: String(line?.inventoryItemId || "").trim(),
        }))
      : [emptyOtherLine()];

  next.attachments = Array.isArray(d.attachments) ? d.attachments : [];
  next.acDatasheet = d.acDatasheet && typeof d.acDatasheet === "object" ? d.acDatasheet : null;
  next.dcDatasheet = d.dcDatasheet && typeof d.dcDatasheet === "object" ? d.dcDatasheet : null;

  return next;
}
