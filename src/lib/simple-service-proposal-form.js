/** Empty / initial shape for Simple portal service proposal form. */

export const RECORD_TYPE_RFQ = "RFQ";
export const RECORD_TYPE_JOB = "JOB";
export const RECORD_TYPE_INVOICE = "INVOICE";

export const RECORD_TYPES = [RECORD_TYPE_RFQ, RECORD_TYPE_JOB, RECORD_TYPE_INVOICE];

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

export const SIMPLE_SERVICE_PROPOSALS_STORAGE_KEY = "simple-portal-service-proposals-v1";
/** @deprecated Legacy browser cache key — data now lives in MongoDB (SimpleServiceProposal). */

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

/**
 * Map form + display helpers into a list-row for the Service Proposals table.
 * Caller must set `documentNumber` (Classic job/RFQ series) before calling when creating.
 * @param {Record<string, unknown>} form
 * @param {{ companyName?: string, preparedByLabel?: string, approvedByLabel?: string, id?: string }} [meta]
 */
export function formToServiceProposalListRow(form, meta = {}) {
  const scopeTotal = sumLinePrices(form.scopeDetails);
  const otherTotal = sumLinePrices(form.otherItems);
  const subtotal = scopeTotal + otherTotal;
  const showTax = form.customerTaxExempt === false;
  const taxPct = showTax ? parseMoneyInput(form.taxPercent) : 0;
  const taxAmount = showTax ? (scopeTotal * taxPct) / 100 : 0;
  const documentNumber = String(form?.documentNumber ?? "").trim();
  const id =
    String(meta.id || form.id || "").trim() ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sp-${Date.now()}`);

  return {
    ...form,
    id,
    documentNumber,
    quote: documentNumber,
    date: form.dateCreated || "",
    companyName: meta.companyName || "",
    phone: form.customerPhone || "",
    email: form.customerEmail || "",
    quotedBy: meta.preparedByLabel || form.preparedBy || "",
    quoteType: form.quoteType || "",
    notes: form.internalNotes || "",
    total: subtotal + taxAmount,
    proposalTotal: subtotal,
    taxCollected: taxAmount,
    submitDate: form.proposalSubmitDate || "",
    acceptDate: form.proposalAcceptedDate || "",
    status: form.status || "",
    jobStatus: form.jobStatus || "",
    dueDate: form.dueDate || "",
    updatedAt: new Date().toISOString(),
  };
}
