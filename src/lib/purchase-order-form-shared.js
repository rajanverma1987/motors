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
