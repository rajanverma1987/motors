/** Simple portal purchase orders — MongoDB via /api/dashboard/simple-purchase-orders. */

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

export const SIMPLE_PO_RECEIVING_STATUS_ORDERED = "Ordered";
export const SIMPLE_PO_RECEIVING_STATUS_PARTIAL = "Partially Received";
export const SIMPLE_PO_RECEIVING_STATUS_RECEIVED = "Received";
export const SIMPLE_PO_RECEIVING_STATUS_CANCELLED = "Cancelled";
export const SIMPLE_PO_RECEIVING_STATUS_RETURNED = "Returned";

export const SIMPLE_PO_RECEIVING_STATUS_OPTIONS = [
  { value: SIMPLE_PO_RECEIVING_STATUS_ORDERED, label: "Ordered" },
  { value: SIMPLE_PO_RECEIVING_STATUS_PARTIAL, label: "Partially Received" },
  { value: SIMPLE_PO_RECEIVING_STATUS_RECEIVED, label: "Received" },
  { value: SIMPLE_PO_RECEIVING_STATUS_CANCELLED, label: "Cancelled" },
  { value: SIMPLE_PO_RECEIVING_STATUS_RETURNED, label: "Returned" },
];

export const SIMPLE_PO_RETURN_PAID_BY_OPTIONS = [
  { value: "Vendor", label: "Vendor" },
  { value: "Company", label: "Company" },
];

/** Dropdown labels for return shipping — values stay Vendor | Company for storage. */
export function buildPoReturnPaidByOptions(vendorName, companyName) {
  return [
    { value: "Vendor", label: String(vendorName || "").trim() || "Vendor" },
    { value: "Company", label: String(companyName || "").trim() || "Company" },
  ];
}

export function parsePoMoney(value) {
  const n = Number.parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Keep digits and a single decimal point (no letters/symbols). */
export function sanitizePoNumericInput(raw) {
  let s = String(raw ?? "").replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot >= 0) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s;
}

/** Round to cents so UI totals and payment status stay in sync. */
export function roundPoMoney(value) {
  return Math.round((parsePoMoney(value) + Number.EPSILON) * 100) / 100;
}

function newId(prefix) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    id: newId("pol"),
    itemName: "",
    uom: "",
    quantity: "0",
    price: "0.00",
    taxPercent: "0",
    receivedQty: "0",
    receivingStatus: SIMPLE_PO_RECEIVING_STATUS_ORDERED,
    receivedDate: "",
    /** Optional — when set and line becomes Received, on-hand increases */
    inventoryItemId: "",
    cancelled: false,
    cancelledAt: "",
    cancellationReason: "",
    returned: false,
    returnedAt: "",
    returnTrackingNumber: "",
    returnReason: "",
    returnShippingCharge: "",
    returnPaidBy: "",
  };
}

export function isPoLineCancelled(line) {
  return Boolean(line?.cancelled);
}

export function isPoLineReturned(line) {
  return Boolean(line?.returned);
}

/** Cancelled or returned — excluded from totals and shown with strikethrough styling. */
export function isPoLineInactive(line) {
  return isPoLineCancelled(line) || isPoLineReturned(line);
}

export function getPoLineReceivingStatus(line) {
  if (isPoLineCancelled(line)) return SIMPLE_PO_RECEIVING_STATUS_CANCELLED;
  if (isPoLineReturned(line)) return SIMPLE_PO_RECEIVING_STATUS_RETURNED;
  return normalizeReceivingStatus(
    line?.receivingStatus || suggestReceivingStatus(line?.quantity, line?.receivedQty)
  );
}

/** Only Ordered lines (not received) can be cancelled. */
export function canCancelPoLine(line) {
  if (!poLineHasContent(line) || isPoLineInactive(line)) return false;
  return getPoLineReceivingStatus(line) === SIMPLE_PO_RECEIVING_STATUS_ORDERED;
}

/** Received or partially received lines can be returned. */
export function canReturnPoLine(line) {
  if (!poLineHasContent(line) || isPoLineInactive(line)) return false;
  const status = getPoLineReceivingStatus(line);
  return (
    status === SIMPLE_PO_RECEIVING_STATUS_RECEIVED ||
    status === SIMPLE_PO_RECEIVING_STATUS_PARTIAL
  );
}

export function poWasSentToVendor(rowOrForm) {
  return Boolean(String(rowOrForm?.sentToVendorAt || "").trim());
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyPoPayment(overrides = {}) {
  return {
    id: newId("pop"),
    date: todayIsoDate(),
    amount: "",
    method: "",
    paidBy: "",
    notes: "",
    ...overrides,
  };
}

/**
 * Suggest receiving status from ordered vs received qty.
 * @param {string|number} orderedQty
 * @param {string|number} receivedQty
 */
export function suggestReceivingStatus(orderedQty, receivedQty) {
  const ordered = parsePoMoney(orderedQty);
  const received = parsePoMoney(receivedQty);
  if (received <= 0) return SIMPLE_PO_RECEIVING_STATUS_ORDERED;
  if (ordered > 0 && received >= ordered) return SIMPLE_PO_RECEIVING_STATUS_RECEIVED;
  return SIMPLE_PO_RECEIVING_STATUS_PARTIAL;
}

export function resolvePoPaymentStatus(amountPaid, grandTotal) {
  const paid = roundPoMoney(amountPaid);
  const total = roundPoMoney(grandTotal);
  if (paid <= 0) return "Unpaid";
  if (total > 0 && paid >= total) return "Paid";
  if (paid > 0) return "Partial Paid";
  return "Unpaid";
}

/**
 * @param {Array<{ amount?: string|number, date?: string }>} payments
 * @param {number} grandTotal
 */
export function computePoPaymentSummary(payments, grandTotal) {
  const list = Array.isArray(payments) ? payments : [];
  let amountPaid = 0;
  let latestDate = "";
  for (const p of list) {
    amountPaid = roundPoMoney(amountPaid + parsePoMoney(p?.amount));
    const d = String(p?.date || "").trim().slice(0, 10);
    if (d && (!latestDate || d > latestDate)) latestDate = d;
  }
  const total = roundPoMoney(grandTotal);
  const balance = roundPoMoney(Math.max(0, total - amountPaid));
  const paymentStatus = resolvePoPaymentStatus(amountPaid, total);
  return { amountPaid, balance, grandTotal: total, paymentStatus, latestPaymentDate: latestDate };
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
    shippingCharge: "",
    lineItems: [emptyPoLine()],
    payments: [],
    vendorDocuments: [],
    sentToVendorAt: "",
    sentToVendorEmail: "",
    poCancelledAt: "",
    ...overrides,
  };
}

export function computePoLineTotals(line) {
  if (isPoLineInactive(line)) {
    return { total: 0, taxAmount: 0, grandTotal: 0 };
  }
  const qty = parsePoMoney(line?.quantity);
  const price = parsePoMoney(line?.price);
  const taxPct = parsePoMoney(line?.taxPercent);
  const total = roundPoMoney(qty * price);
  const taxAmount = roundPoMoney((total * taxPct) / 100);
  const grandTotal = roundPoMoney(total + taxAmount);
  return { total, taxAmount, grandTotal };
}

export function computePoFormTotals(lineItems, shippingCharge = 0) {
  let total = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const line of Array.isArray(lineItems) ? lineItems : []) {
    if (isPoLineInactive(line)) continue;
    const t = computePoLineTotals(line);
    total = roundPoMoney(total + t.total);
    totalTax = roundPoMoney(totalTax + t.taxAmount);
    grandTotal = roundPoMoney(grandTotal + t.grandTotal);
  }
  const shipping = roundPoMoney(shippingCharge);
  grandTotal = roundPoMoney(grandTotal + shipping);
  return { total, totalTax, shipping, grandTotal };
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

export function normalizeReceivingStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "cancelled") return SIMPLE_PO_RECEIVING_STATUS_CANCELLED;
  if (s === "returned") return SIMPLE_PO_RECEIVING_STATUS_RETURNED;
  if (s === "received") return SIMPLE_PO_RECEIVING_STATUS_RECEIVED;
  if (s.includes("partial")) return SIMPLE_PO_RECEIVING_STATUS_PARTIAL;
  return SIMPLE_PO_RECEIVING_STATUS_ORDERED;
}

/**
 * Overall PO / receiving status from line items.
 * Ordered | Partially Received | Received
 */
export function resolvePoStatus(lineItems) {
  const lines = (Array.isArray(lineItems) ? lineItems : []).filter((line) => poLineHasContent(line));
  if (lines.length === 0) return SIMPLE_PO_RECEIVING_STATUS_ORDERED;
  const active = lines.filter((line) => !isPoLineInactive(line));
  if (active.length === 0) {
    if (lines.every((line) => isPoLineReturned(line))) return SIMPLE_PO_RECEIVING_STATUS_RETURNED;
    if (lines.every((line) => isPoLineCancelled(line))) return SIMPLE_PO_RECEIVING_STATUS_CANCELLED;
    return SIMPLE_PO_RECEIVING_STATUS_PARTIAL;
  }
  let received = 0;
  let partial = 0;
  for (const line of active) {
    const status = getPoLineReceivingStatus(line);
    if (status === SIMPLE_PO_RECEIVING_STATUS_RECEIVED) received += 1;
    else if (status === SIMPLE_PO_RECEIVING_STATUS_PARTIAL) partial += 1;
  }
  if (received === active.length) return SIMPLE_PO_RECEIVING_STATUS_RECEIVED;
  if (partial > 0 || received > 0) return SIMPLE_PO_RECEIVING_STATUS_PARTIAL;
  return SIMPLE_PO_RECEIVING_STATUS_ORDERED;
}

/** Map a stored PO row into editable form state. */
export function storedPoToForm(row) {
  const base = createEmptySimplePurchaseOrderForm();
  if (!row || typeof row !== "object") return base;
  const lines = Array.isArray(row.lineItems)
    ? row.lineItems.map((line) => {
        const merged = { ...emptyPoLine(), ...line };
        return {
          ...merged,
          cancelled: Boolean(merged.cancelled),
          cancelledAt: String(merged.cancelledAt || "").trim(),
          cancellationReason: String(merged.cancellationReason || "").trim(),
          returned: Boolean(merged.returned),
          returnedAt: String(merged.returnedAt || "").trim(),
          returnTrackingNumber: String(merged.returnTrackingNumber || "").trim(),
          returnReason: String(merged.returnReason || "").trim(),
          returnShippingCharge:
            merged.returnShippingCharge != null && String(merged.returnShippingCharge).trim() !== ""
              ? String(merged.returnShippingCharge)
              : "",
          returnPaidBy: String(merged.returnPaidBy || "").trim(),
          receivedQty: merged.receivedQty != null && merged.receivedQty !== "" ? String(merged.receivedQty) : "0",
          receivingStatus: isPoLineCancelled(merged)
            ? SIMPLE_PO_RECEIVING_STATUS_CANCELLED
            : isPoLineReturned(merged)
              ? SIMPLE_PO_RECEIVING_STATUS_RETURNED
              : normalizeReceivingStatus(merged.receivingStatus),
          receivedDate: String(merged.receivedDate || "").slice(0, 10),
        };
      })
    : [];
  const withTrailing = [...lines];
  if (!withTrailing.length || lineHasContentForEdit(withTrailing[withTrailing.length - 1])) {
    withTrailing.push(emptyPoLine());
  }
  const payments = Array.isArray(row.payments)
    ? row.payments.map((p) => ({
        ...emptyPoPayment(),
        ...p,
        id: String(p?.id || "").trim() || newId("pop"),
        date: String(p?.date || "").slice(0, 10),
        amount: p?.amount != null ? String(p.amount) : "",
        method: String(p?.method || ""),
        paidBy: String(p?.paidBy || ""),
        notes: String(p?.notes || ""),
      }))
    : [];
  const vendorDocuments = Array.isArray(row.vendorDocuments)
    ? row.vendorDocuments
        .map((d) => ({
          url: String(d?.url || "").trim(),
          name: String(d?.name || "").trim(),
          uploadedAt: String(d?.uploadedAt || "").trim(),
        }))
        .filter((d) => d.url)
    : [];

  const totals = computePoFormTotals(withTrailing, row.shippingCharge);
  const paySummary = computePoPaymentSummary(payments, totals.grandTotal);

  return {
    ...base,
    ...row,
    poType: resolveSimplePoType(row),
    shippingCharge:
      row.shippingCharge != null && String(row.shippingCharge).trim() !== ""
        ? String(row.shippingCharge)
        : "",
    lineItems: withTrailing,
    payments,
    vendorDocuments,
    paymentStatus: paySummary.paymentStatus || row.paymentStatus || "Unpaid",
    poPaidDate:
      paySummary.paymentStatus === "Unpaid"
        ? ""
        : paySummary.latestPaymentDate || String(row.poPaidDate || "").slice(0, 10),
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

/** True when a line has enough content to appear on Receiving tab. */
export function poLineHasContent(line) {
  return lineHasContentForEdit(line);
}

/**
 * @param {ReturnType<typeof createEmptySimplePurchaseOrderForm>} form
 * @param {{ vendorName?: string, vendorPhone?: string, id?: string }} [meta]
 */
export function formToSimplePurchaseOrderRow(form, meta = {}) {
  const shippingCharge = roundPoMoney(form.shippingCharge);
  const totals = computePoFormTotals(form.lineItems, shippingCharge);
  const id =
    String(meta.id || form.id || "").trim() ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `spo-${Date.now()}`);
  const lineItems = (Array.isArray(form.lineItems) ? form.lineItems : [])
    .map((line) => {
      const cancelled = isPoLineCancelled(line);
      const returned = isPoLineReturned(line);
      const t = computePoLineTotals(line);
      const receivedQty = String(line.receivedQty ?? "0");
      const receivingStatus = cancelled
        ? SIMPLE_PO_RECEIVING_STATUS_CANCELLED
        : returned
          ? SIMPLE_PO_RECEIVING_STATUS_RETURNED
          : normalizeReceivingStatus(
              line.receivingStatus || suggestReceivingStatus(line.quantity, receivedQty)
            );
      return {
        ...line,
        cancelled,
        cancelledAt: String(line.cancelledAt || "").trim(),
        cancellationReason: String(line.cancellationReason || "").trim(),
        returned,
        returnedAt: String(line.returnedAt || "").trim(),
        returnTrackingNumber: String(line.returnTrackingNumber || "").trim(),
        returnReason: String(line.returnReason || "").trim(),
        returnShippingCharge:
          line.returnShippingCharge != null && String(line.returnShippingCharge).trim() !== ""
            ? String(line.returnShippingCharge)
            : "",
        returnPaidBy: String(line.returnPaidBy || "").trim(),
        receivedQty,
        receivingStatus,
        receivedDate: String(line.receivedDate || "").slice(0, 10),
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

  const payments = (Array.isArray(form.payments) ? form.payments : [])
    .map((p) => ({
      id: String(p?.id || "").trim() || newId("pop"),
      date: String(p?.date || "").slice(0, 10),
      amount: String(p?.amount ?? "").trim(),
      method: String(p?.method || "").trim(),
      paidBy: String(p?.paidBy || "").trim(),
      notes: String(p?.notes || "").trim(),
    }))
    .filter((p) => parsePoMoney(p.amount) > 0 || p.date || p.method || p.notes);

  const paySummary = computePoPaymentSummary(payments, totals.grandTotal);
  const vendorDocuments = Array.isArray(form.vendorDocuments)
    ? form.vendorDocuments
        .map((d) => ({
          url: String(d?.url || "").trim(),
          name: String(d?.name || "").trim(),
          uploadedAt: String(d?.uploadedAt || "").trim(),
        }))
        .filter((d) => d.url)
    : [];

  const allReceived =
    lineItems.length > 0 &&
    lineItems.every(
      (l) =>
        isPoLineInactive(l) ||
        normalizeReceivingStatus(l.receivingStatus) === SIMPLE_PO_RECEIVING_STATUS_RECEIVED
    );
  const activeLines = lineItems.filter((l) => !isPoLineInactive(l));
  const allCancelled = lineItems.length > 0 && activeLines.length === 0 && lineItems.every((l) => isPoLineCancelled(l));
  let poItemReceiveDate = String(form.poItemReceiveDate || "").slice(0, 10);
  if (allReceived) {
    let latest = "";
    for (const l of lineItems) {
      const d = String(l.receivedDate || "").slice(0, 10);
      if (d && (!latest || d > latest)) latest = d;
    }
    poItemReceiveDate = latest || poItemReceiveDate || todayIsoDate();
  }

  return {
    ...form,
    id,
    poType: resolveSimplePoType(form),
    vendorName: meta.vendorName || form.vendorName || "",
    vendorPhone: meta.vendorPhone || form.vendorPhone || "",
    lineItems: lineItems.length ? lineItems : [emptyPoLine()],
    payments,
    vendorDocuments,
    paymentStatus: paySummary.paymentStatus,
    poPaidDate: paySummary.paymentStatus === "Unpaid" ? "" : paySummary.latestPaymentDate || "",
    poItemReceiveDate,
    shippingCharge,
    total: totals.total,
    totalTax: totals.totalTax,
    grandTotal: totals.grandTotal,
    sentToVendorAt: String(form.sentToVendorAt || "").trim(),
    sentToVendorEmail: String(form.sentToVendorEmail || "").trim(),
    poCancelledAt: allCancelled
      ? String(form.poCancelledAt || "").trim() || new Date().toISOString()
      : "",
    updatedAt: new Date().toISOString(),
    createdAt: form.createdAt || new Date().toISOString(),
  };
}
