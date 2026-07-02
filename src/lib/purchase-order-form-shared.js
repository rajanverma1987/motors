import { poLineTaxAmount, poLineTotalWithTax } from "@/lib/po-line-item-totals";

export const PO_LINE_COLUMNS = [
  { key: "description", label: "Description", width: "30%" },
  { key: "qty", label: "Qty", type: "number", width: "8%" },
  { key: "uom", label: "UOM", width: "10%" },
  { key: "unitPrice", label: "Unit price", type: "number", step: "0.00001", width: "12%" },
  { key: "taxPercent", label: "Tax %", type: "number", width: "9%" },
  {
    key: "lineTax",
    label: "Tax",
    calculated: true,
    type: "number",
    formula: (row) => {
      const v = poLineTaxAmount(row);
      if (v == null || !Number.isFinite(v)) return "";
      return Math.round(v * 100) / 100;
    },
    displayDecimals: 2,
  },
  {
    key: "total",
    label: "Total",
    calculated: true,
    type: "number",
    formula: (row) => {
      const v = poLineTotalWithTax(row);
      if (v == null || !Number.isFinite(v)) return "";
      return Math.round(v * 100) / 100;
    },
    displayDecimals: 2,
  },
];

export const PO_TYPE_OPTIONS = [
  { value: "shop", label: "Shop PO" },
  { value: "job", label: "Job PO (linked to repair job or quote)" },
];

export const INITIAL_PO_FORM = {
  vendorId: "",
  type: "shop",
  quoteId: "",
  repairFlowJobId: "",
  lineItems: [],
  notes: "",
  attachments: [],
};

export function buildPurchaseOrderPayload(form) {
  const f = form || {};
  return {
    vendorId: f.vendorId ?? "",
    type: f.type === "job" ? "job" : "shop",
    quoteId: f.type === "job" ? String(f.quoteId ?? "").trim() : "",
    repairFlowJobId: f.type === "job" ? String(f.repairFlowJobId ?? "").trim() : "",
    lineItems: Array.isArray(f.lineItems) ? f.lineItems : [],
    notes: f.notes ?? "",
    attachments: Array.isArray(f.attachments) ? f.attachments : [],
  };
}

/** Map RFQ other-cost lines into PO line items. */
export function partsLinesToPoLineItems(partsLines) {
  const lines = Array.isArray(partsLines) ? partsLines : [];
  return lines
    .filter((row) => String(row?.item ?? "").trim() || String(row?.inventoryItemId ?? "").trim())
    .map((row) => ({
      description: String(row.item || "").trim() || "Part",
      qty: String(row.qty ?? "1"),
      uom: String(row.uom || "ea").trim() || "ea",
      unitPrice: String(row.price ?? "0"),
      taxPercent: "0",
      inventoryItemId: String(row.inventoryItemId || "").trim(),
      status: "Ordered",
    }));
}

/** Preview next shop PO number from existing rows (client-side). */
export function previewShopPoNumber(pos) {
  let maxNum = 0;
  for (const p of pos || []) {
    const m = (p.poNumber || "").match(/^P(\d+)$/i);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return "P" + String(maxNum + 1).padStart(5, "0");
}

/** Preview next job PO number for an RFQ (client-side). */
export function previewJobPoNumber(rfqNumber, existingPoCount) {
  const rfq = String(rfqNumber || "").trim();
  if (!rfq) return null;
  const count = Number.isFinite(existingPoCount) ? existingPoCount : 0;
  return `PO-${rfq}-${count + 1}`;
}

/** Build create-PO defaults when opened from a saved RFQ. */
export function buildPurchaseOrderInitialFromQuote({ quoteId, rfqNumber, repairFlowJobId, partsLines }) {
  const qid = String(quoteId || "").trim();
  const rfqLabel = String(rfqNumber || "").trim();
  return {
    vendorId: "",
    type: "job",
    quoteId: qid,
    repairFlowJobId: String(repairFlowJobId || "").trim(),
    lineItems: partsLinesToPoLineItems(partsLines),
    notes: rfqLabel ? `Linked to RFQ ${rfqLabel}` : "",
    attachments: [],
  };
}
