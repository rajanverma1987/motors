import { toInputDateValue } from "@/lib/format-date";
import {
  emptyOtherLine,
  roundSpMoney,
  todayISODate,
} from "@/lib/simple-service-proposal-form";

export const KIND_RECEIVING = "motor_receiving";
export const KIND_SHIPPING = "motor_shipping";

export const RECEIVING_CHARGE_DESCRIPTION = "Receiving Charge";
export const SHIPPING_CHARGE_DESCRIPTION = "Shipping Charge";

function newLineId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `other-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function logisticsChargeKindFromKind(kind) {
  return kind === KIND_RECEIVING ? "receiving" : "shipping";
}

export function logisticsChargeDescription(kind) {
  return kind === KIND_RECEIVING ? RECEIVING_CHARGE_DESCRIPTION : SHIPPING_CHARGE_DESCRIPTION;
}

export function isLogisticsChargeOtherLine(line) {
  if (!line || typeof line !== "object") return false;
  const lk = String(line.logisticsChargeKind || "").trim().toLowerCase();
  if (lk === "receiving" || lk === "shipping") return true;
  const desc = String(line.description || "").trim();
  return desc === RECEIVING_CHARGE_DESCRIPTION || desc === SHIPPING_CHARGE_DESCRIPTION;
}

function lineHasContent(line) {
  if (!line || typeof line !== "object") return false;
  return (
    String(line.description || "").trim() !== "" ||
    String(line.price ?? "").trim() !== "" ||
    String(line.uom || "").trim() !== "" ||
    String(line.qty ?? "").trim() !== ""
  );
}

/** Empty motor receiving / shipping record stored on SimpleServiceProposal. */
export function emptyMotorLogisticsRecord(kind, defaults = {}) {
  const isReceiving = kind === KIND_RECEIVING;
  return {
    date: todayISODate(),
    jobNumber: isReceiving ? String(defaults.jobNumber || "").trim() : "",
    invoiceNumber: !isReceiving ? String(defaults.invoiceNumber || "").trim() : "",
    shippingPo: !isReceiving ? String(defaults.shippingPo || "").trim() : "",
    mannerOfTransport: "",
    freight: "",
    droppedBy: "",
    pickedBy: "",
    charges: "",
    paidBy: "",
    notes: "",
    updatedAt: "",
  };
}

/** Normalize stored motor receiving / shipping from Mongo/API. */
export function normalizeMotorLogisticsRecord(raw, kind, defaults = {}) {
  if (!raw || typeof raw !== "object") return emptyMotorLogisticsRecord(kind, defaults);
  const base = emptyMotorLogisticsRecord(kind, defaults);
  const isReceiving = kind === KIND_RECEIVING;
  return {
    ...base,
    date: toInputDateValue(raw.date) || base.date,
    jobNumber: isReceiving
      ? String(raw.jobNumber || defaults.jobNumber || "").trim()
      : "",
    invoiceNumber: !isReceiving
      ? String(raw.invoiceNumber || defaults.invoiceNumber || "").trim()
      : "",
    shippingPo: !isReceiving
      ? String(raw.shippingPo || defaults.shippingPo || "").trim()
      : "",
    mannerOfTransport: String(raw.mannerOfTransport || "").trim(),
    freight: String(raw.freight || "").trim(),
    droppedBy: String(raw.droppedBy || "").trim(),
    pickedBy: String(raw.pickedBy || "").trim(),
    charges: String(raw.charges ?? "").trim(),
    paidBy: String(raw.paidBy || "").trim(),
    notes: String(raw.notes || "").trim(),
    updatedAt: String(raw.updatedAt || "").trim(),
  };
}

/** Map modal form fields to the object stored on SimpleServiceProposal. */
export function motorLogisticsFormToStored(form, kind) {
  const isReceiving = kind === KIND_RECEIVING;
  const src = form && typeof form === "object" ? form : {};
  return {
    date: String(src.date || "").trim() || todayISODate(),
    jobNumber: isReceiving ? String(src.jobNumber || "").trim() : "",
    invoiceNumber: !isReceiving ? String(src.invoiceNumber || "").trim() : "",
    shippingPo: !isReceiving ? String(src.shippingPo || "").trim() : "",
    mannerOfTransport: String(src.mannerOfTransport || "").trim(),
    freight: String(src.freight || "").trim(),
    droppedBy: isReceiving ? String(src.droppedBy || "").trim() : "",
    pickedBy: !isReceiving ? String(src.pickedBy || "").trim() : "",
    charges: String(src.charges ?? "").trim(),
    paidBy: String(src.paidBy || "").trim(),
    notes: String(src.notes || "").trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function motorLogisticsRecordHasData(record) {
  if (!record || typeof record !== "object") return false;
  return Boolean(
    String(record.mannerOfTransport || "").trim() ||
      String(record.freight || "").trim() ||
      String(record.droppedBy || "").trim() ||
      String(record.pickedBy || "").trim() ||
      String(record.charges ?? "").trim() ||
      String(record.paidBy || "").trim() ||
      String(record.notes || "").trim()
  );
}

/**
 * Upsert or remove Receiving/Shipping Charge in Other Items when paid by customer.
 * @param {Array<Record<string, unknown>>} otherItems
 * @param {{ kind: string, charges: string|number, paidBy: string }} options
 */
export function applyCustomerLogisticsChargeToOtherItems(otherItems, { kind, charges, paidBy }) {
  const items = Array.isArray(otherItems) ? otherItems : [];
  const chargeKind = logisticsChargeKindFromKind(kind);
  const description = logisticsChargeDescription(kind);
  const amount = roundSpMoney(charges);
  const isCustomerPaid =
    String(paidBy || "").trim().toLowerCase() === "customer" && amount > 0;

  const isLogisticsChargeLine = (line) => {
    const lk = String(line?.logisticsChargeKind || "").trim().toLowerCase();
    if (lk === chargeKind) return true;
    return !lk && String(line?.description || "").trim() === description;
  };

  const withoutCharge = items.filter((line) => !isLogisticsChargeLine(line));

  if (!isCustomerPaid) {
    const filled = withoutCharge.filter(lineHasContent);
    return filled.length ? [...filled, emptyOtherLine()] : [emptyOtherLine()];
  }

  const existing = items.find(isLogisticsChargeLine);
  const chargeLine = {
    ...emptyOtherLine(),
    ...(existing && typeof existing === "object" ? existing : {}),
    id: String(existing?.id || "").trim() || newLineId(),
    description,
    uom: "",
    qty: "",
    price: String(amount),
    logisticsChargeKind: chargeKind,
    inventoryItemId: "",
  };

  const filled = [...withoutCharge.filter(lineHasContent), chargeLine];
  return [...filled, emptyOtherLine()];
}

/** Strip auto logistics charge lines (used when copying a proposal). */
export function stripLogisticsChargeOtherItems(otherItems) {
  const items = Array.isArray(otherItems) ? otherItems : [];
  const kept = items.filter((line) => {
    const lk = String(line?.logisticsChargeKind || "").trim().toLowerCase();
    if (lk === "receiving" || lk === "shipping") return false;
    const desc = String(line?.description || "").trim();
    if (desc === RECEIVING_CHARGE_DESCRIPTION || desc === SHIPPING_CHARGE_DESCRIPTION) return false;
    return true;
  });
  const filled = kept.filter(lineHasContent);
  return filled.length ? [...filled, emptyOtherLine()] : [emptyOtherLine()];
}
