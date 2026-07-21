/** Simple portal purchase orders — localStorage until server persistence. */

export const SIMPLE_PURCHASE_ORDERS_STORAGE_KEY = "simple-portal-purchase-orders-v1";

export const SIMPLE_PO_TYPE_JOB = "job";
export const SIMPLE_PO_TYPE_SHOP = "shop";

export const SIMPLE_PO_TYPE_OPTIONS = [
  { value: SIMPLE_PO_TYPE_SHOP, label: "Shop PO" },
  { value: SIMPLE_PO_TYPE_JOB, label: "Job PO" },
];

export const SIMPLE_PO_PAYMENT_METHOD_OPTIONS = [
  { value: "Check", label: "Check" },
  { value: "ACH", label: "ACH" },
  { value: "Card", label: "Card" },
  { value: "Cash", label: "Cash" },
  { value: "Wire", label: "Wire" },
  { value: "Other", label: "Other" },
];

export const SIMPLE_PO_PAYMENT_STATUS_OPTIONS = [
  { value: "Unpaid", label: "Unpaid" },
  { value: "Partial Paid", label: "Partial Paid" },
  { value: "Paid", label: "Paid" },
];

export function parsePoMoney(value) {
  const n = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Resolve Job vs Shop for stored rows (legacy rows with a job link count as Job). */
export function resolveSimplePoType(row) {
  const t = String(row?.poType || row?.type || "")
    .trim()
    .toLowerCase();
  if (t === SIMPLE_PO_TYPE_SHOP || t === "shop") return SIMPLE_PO_TYPE_SHOP;
  if (t === SIMPLE_PO_TYPE_JOB || t === "job") return SIMPLE_PO_TYPE_JOB;
  if (String(row?.serviceProposalId || "").trim() || String(row?.jobNumber || "").trim()) {
    return SIMPLE_PO_TYPE_JOB;
  }
  return SIMPLE_PO_TYPE_SHOP;
}

export function simplePoTypeLabel(rowOrType) {
  const t =
    typeof rowOrType === "string" || rowOrType == null
      ? String(rowOrType || "").trim().toLowerCase() || SIMPLE_PO_TYPE_SHOP
      : resolveSimplePoType(rowOrType);
  return t === SIMPLE_PO_TYPE_JOB ? "Job PO" : "Shop PO";
}

export function emptyPoLine() {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `pol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemName: "",
    uom: "",
    quantity: "0",
    price: "0.00",
    taxPercent: "0",
  };
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createEmptySimplePurchaseOrderForm(overrides = {}) {
  return {
    id: "",
    poType: SIMPLE_PO_TYPE_JOB,
    serviceProposalId: "",
    jobNumber: "",
    poNumber: "",
    vendorId: "",
    vendorName: "",
    vendorPhone: "",
    dueDate: "",
    poCutDate: todayIsoDate(),
    poInvoiceReceiveDate: "",
    poItemReceiveDate: "",
    poPaidDate: "",
    paymentMethod: "",
    paidBy: "",
    paymentStatus: "Unpaid",
    comments: "",
    lineItems: [emptyPoLine()],
    ...overrides,
  };
}

export function computePoLineTotals(line) {
  const qty = parsePoMoney(line?.quantity);
  const price = parsePoMoney(line?.price);
  const taxPct = parsePoMoney(line?.taxPercent);
  const total = qty * price;
  const taxAmount = (total * taxPct) / 100;
  const grandTotal = total + taxAmount;
  return { total, taxAmount, grandTotal };
}

export function computePoFormTotals(lineItems) {
  let total = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const line of Array.isArray(lineItems) ? lineItems : []) {
    const t = computePoLineTotals(line);
    total += t.total;
    totalTax += t.taxAmount;
    grandTotal += t.grandTotal;
  }
  return { total, totalTax, grandTotal };
}

/**
 * Next PO number for a job: `{jobNumber}-1`, `{jobNumber}-2`, …
 * @param {string} jobNumber
 * @param {Array<{ jobNumber?: string, poNumber?: string }>} existingPos
 */
export function computeNextSimplePoNumber(jobNumber, existingPos = []) {
  const job = String(jobNumber || "").trim();
  if (!job) return "";
  const prefix = `${job}-`;
  let max = 0;
  for (const po of Array.isArray(existingPos) ? existingPos : []) {
    const num = String(po?.poNumber || "").trim();
    if (!num.toLowerCase().startsWith(prefix.toLowerCase())) continue;
    const suffix = num.slice(prefix.length);
    const n = Number.parseInt(suffix, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${job}-${max + 1}`;
}

export function loadStoredSimplePurchaseOrders() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SIMPLE_PURCHASE_ORDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredSimplePurchaseOrders(rows) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIMPLE_PURCHASE_ORDERS_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore quota */
  }
}

/** POs linked to a Simple job (by record id and/or job number). */
export function listSimplePurchaseOrdersForJob(serviceProposalId, jobNumber) {
  const sid = String(serviceProposalId || "").trim();
  const job = String(jobNumber || "").trim();
  return loadStoredSimplePurchaseOrders()
    .filter((p) => {
      if (sid && String(p.serviceProposalId || "").trim() === sid) return true;
      if (job && String(p.jobNumber || "").trim() === job) return true;
      return false;
    })
    .sort((a, b) => String(a.poNumber || "").localeCompare(String(b.poNumber || ""), undefined, { numeric: true }));
}

/** Map a stored PO row into editable form state. */
export function storedPoToForm(row) {
  const base = createEmptySimplePurchaseOrderForm();
  if (!row || typeof row !== "object") return base;
  const lines = Array.isArray(row.lineItems)
    ? row.lineItems.map((line) => ({ ...emptyPoLine(), ...line }))
    : [];
  const withTrailing = [...lines];
  if (!withTrailing.length || lineHasContentForEdit(withTrailing[withTrailing.length - 1])) {
    withTrailing.push(emptyPoLine());
  }
  return {
    ...base,
    ...row,
    poType: resolveSimplePoType(row),
    lineItems: withTrailing,
  };
}

function lineHasContentForEdit(line) {
  return Boolean(
    String(line?.itemName ?? "").trim() ||
      String(line?.uom ?? "").trim() ||
      parsePoMoney(line?.quantity) ||
      parsePoMoney(line?.price) ||
      parsePoMoney(line?.taxPercent)
  );
}

/**
 * @param {ReturnType<typeof createEmptySimplePurchaseOrderForm>} form
 * @param {{ vendorName?: string, vendorPhone?: string, id?: string }} [meta]
 */
export function formToSimplePurchaseOrderRow(form, meta = {}) {
  const totals = computePoFormTotals(form.lineItems);
  const id =
    String(meta.id || form.id || "").trim() ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `spo-${Date.now()}`);
  const lineItems = (Array.isArray(form.lineItems) ? form.lineItems : [])
    .map((line) => {
      const t = computePoLineTotals(line);
      return {
        ...line,
        total: t.total,
        taxAmount: t.taxAmount,
        grandTotal: t.grandTotal,
      };
    })
    .filter(
      (line) =>
        String(line.itemName || "").trim() ||
        parsePoMoney(line.quantity) ||
        parsePoMoney(line.price) ||
        parsePoMoney(line.taxPercent)
    );

  return {
    ...form,
    id,
    poType: resolveSimplePoType(form),
    vendorName: meta.vendorName || form.vendorName || "",
    vendorPhone: meta.vendorPhone || form.vendorPhone || "",
    lineItems: lineItems.length ? lineItems : [emptyPoLine()],
    total: totals.total,
    totalTax: totals.totalTax,
    grandTotal: totals.grandTotal,
    updatedAt: new Date().toISOString(),
    createdAt: form.createdAt || new Date().toISOString(),
  };
}
