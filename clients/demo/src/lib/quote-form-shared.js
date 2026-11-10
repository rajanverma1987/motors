import { WRITE_UP_QUOTE_STATUS } from "@/lib/quote-rfq-lifecycle";

export const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

export const ADD_MOTOR_INITIAL = {
  customerId: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  hp: "",
  rpm: "",
  voltage: "",
  kw: "",
  amps: "",
  frameSize: "",
  motorType: "",
  slots: "",
  coreLength: "",
  coreDiameter: "",
  bars: "",
  notes: "",
};

export function buildAddMotorPayload(form) {
  const f = form || {};
  return {
    customerId: f.customerId ?? "",
    serialNumber: f.serialNumber ?? "",
    manufacturer: f.manufacturer ?? "",
    model: f.model ?? "",
    hp: f.hp ?? "",
    rpm: f.rpm ?? "",
    voltage: f.voltage ?? "",
    kw: f.kw ?? "",
    amps: f.amps ?? "",
    frameSize: f.frameSize ?? "",
    motorType: f.motorType ?? "",
    slots: f.slots ?? "",
    coreLength: f.coreLength ?? "",
    coreDiameter: f.coreDiameter ?? "",
    bars: f.bars ?? "",
    motorPhotos: [],
    nameplateImages: [],
    notes: f.notes ?? "",
  };
}

export const SCOPE_COLUMNS = [
  { key: "scope", label: "Scope", width: "75%" },
  { key: "price", label: "Price", type: "number", width: "25%" },
];

export const PARTS_COLUMNS = [
  { key: "item", label: "Item", width: "32%" },
  { key: "qty", label: "Qty", type: "number", width: "12%" },
  { key: "uom", label: "UOM", width: "12%" },
  { key: "price", label: "Price", type: "number", width: "14%" },
  {
    key: "total",
    label: "Total",
    calculated: true,
    type: "number",
    formula: (row) => {
      const q = parseFloat(row?.qty ?? "1");
      const p = parseFloat(row?.price ?? "0");
      return Number.isFinite(q) && Number.isFinite(p) ? q * p : "";
    },
  },
];

export function todayString() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export const INITIAL_QUOTE_FORM = {
  customerId: "",
  motorId: "",
  leadId: "",
  status: WRITE_UP_QUOTE_STATUS,
  customerPo: "",
  date: todayString(),
  preparedBy: "",
  technicianEmployeeId: "",
  rfqNumber: "",
  repairScope: "",
  laborTotal: "",
  partsTotal: "",
  customerTaxExempt: true,
  customerTaxPercent: "0",
  scopeLines: [],
  partsLines: [],
  estimatedCompletion: "",
  customerNotes: "",
  notes: "",
  repairFlowJobId: "",
  motorRepairFlowQuoteId: "",
  quoteId: "",
  workOrderId: "",
};

export function sumLinePrices(lines, priceKey = "price") {
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const row of lines) {
    const p = parseFloat(row?.[priceKey]);
    if (Number.isFinite(p)) sum += p;
  }
  return sum;
}

export function sumPartsLineTotals(lines) {
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const row of lines) {
    const q = parseFloat(row?.qty ?? "1");
    const p = parseFloat(row?.price ?? "0");
    if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
  }
  return sum;
}

export function buildQuotePayload(form) {
  const f = form || {};
  const scopeLines = Array.isArray(f.scopeLines) ? f.scopeLines : [];
  const partsLines = Array.isArray(f.partsLines) ? f.partsLines : [];
  const laborFromLines = scopeLines.length ? sumLinePrices(scopeLines).toFixed(2) : (f.laborTotal ?? "");
  const partsFromLines = partsLines.length ? sumPartsLineTotals(partsLines).toFixed(2) : (f.partsTotal ?? "");
  return {
    customerId: f.customerId ?? "",
    motorId: f.motorId ?? "",
    leadId: f.leadId ?? "",
    status: f.status ?? "draft",
    customerPo: f.customerPo ?? "",
    date: f.date ?? "",
    preparedBy: f.preparedBy ?? "",
    technicianEmployeeId: f.technicianEmployeeId ?? "",
    repairScope: f.repairScope ?? "",
    laborTotal: laborFromLines,
    partsTotal: partsFromLines,
    customerTaxExempt: f.customerTaxExempt !== false,
    customerTaxPercent: f.customerTaxExempt ? "0" : (f.customerTaxPercent ?? "0"),
    scopeLines,
    partsLines,
    estimatedCompletion: f.estimatedCompletion ?? "",
    customerNotes: f.customerNotes ?? "",
    notes: f.notes ?? "",
  };
}

/** Map API quote record to edit form state */
export function quoteApiToForm(dataToUse, customers) {
  const customerForQuote = (customers || []).find((c) => c.id === (dataToUse.customerId ?? ""));
  return {
    customerId: dataToUse.customerId ?? "",
    motorId: dataToUse.motorId ?? "",
    leadId: dataToUse.leadId ?? "",
    status: dataToUse.status ?? "draft",
    customerPo: dataToUse.customerPo ?? "",
    date: dataToUse.date ?? todayString(),
    preparedBy: dataToUse.preparedBy ?? "",
    technicianEmployeeId: dataToUse.technicianEmployeeId ?? "",
    rfqNumber: dataToUse.rfqNumber ?? "",
    repairScope: dataToUse.repairScope ?? "",
    laborTotal: dataToUse.laborTotal ?? "",
    partsTotal: dataToUse.partsTotal ?? "",
    customerTaxExempt:
      dataToUse.customerTaxExempt !== undefined
        ? dataToUse.customerTaxExempt !== false
        : customerForQuote?.taxExempt !== false,
    customerTaxPercent:
      dataToUse.customerTaxPercent ??
      (customerForQuote?.taxExempt === false ? String(customerForQuote?.taxPercent ?? "0") : "0"),
    scopeLines: Array.isArray(dataToUse.scopeLines) ? dataToUse.scopeLines : [],
    partsLines: (Array.isArray(dataToUse.partsLines) ? dataToUse.partsLines : []).map((row) => ({
      ...row,
      qty: row?.qty ?? "1",
    })),
    estimatedCompletion: dataToUse.estimatedCompletion ?? "",
    customerNotes: dataToUse.customerNotes ?? "",
    notes: dataToUse.notes ?? "",
    repairFlowJobId: dataToUse.repairFlowJobId ?? "",
    motorRepairFlowQuoteId: dataToUse.motorRepairFlowQuoteId ?? "",
    quoteId: dataToUse.id ?? "",
    workOrderId: dataToUse.workOrderId ?? "",
  };
}
