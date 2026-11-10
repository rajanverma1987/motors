import mongoose from "mongoose";
import { toInputDateValue, toMongoCalendarDate } from "@/lib/format-date";

const INTERNAL_KEYS = new Set([
  "_id",
  "__v",
  "createdByEmail",
  "id",
  "createdAt",
  "updatedAt",
]);

/** Top-level calendar fields on Simple SP / PO documents. */
export const SIMPLE_PORTAL_DATE_FIELDS = [
  "dateCreated",
  "date",
  "dueDate",
  "proposalSubmitDate",
  "proposalAcceptedDate",
  "invoiceSubmitDate",
  "invoicePaidDate",
  "submitDate",
  "acceptDate",
  "poCutDate",
  "poInvoiceReceiveDate",
  "poItemReceiveDate",
  "poPaidDate",
];

/**
 * Strip client/internal keys before writing a Simple portal document.
 * Coerces known calendar fields to BSON Date (UTC noon) or null.
 * @param {Record<string, unknown>} body
 * @param {{ locale?: string }} [options]
 */
export function sanitizeSimplePortalPayload(body, options = {}) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (INTERNAL_KEYS.has(key)) continue;
    out[key] = value;
  }

  for (const key of SIMPLE_PORTAL_DATE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) continue;
    out[key] = toMongoCalendarDate(out[key], options);
  }

  // Keep list alias `date` aligned with dateCreated when either is set on SP writes.
  if (Object.prototype.hasOwnProperty.call(out, "dateCreated") || Object.prototype.hasOwnProperty.call(out, "date")) {
    const primary = out.dateCreated ?? out.date ?? null;
    out.dateCreated = primary;
    out.date = primary;
  }

  if (Array.isArray(out.payments)) {
    out.payments = out.payments.map((p) => {
      if (!p || typeof p !== "object") return p;
      if (!Object.prototype.hasOwnProperty.call(p, "date")) return p;
      return { ...p, date: toMongoCalendarDate(p.date, options) };
    });
  }

  if (Array.isArray(out.lineItems)) {
    out.lineItems = out.lineItems.map((line) => {
      if (!line || typeof line !== "object") return line;
      if (!Object.prototype.hasOwnProperty.call(line, "receivedDate")) return line;
      return { ...line, receivedDate: toMongoCalendarDate(line.receivedDate, options) };
    });
  }

  return out;
}

/**
 * Convert Date (and nested payment/line received dates) to YYYY-MM-DD for JSON/UI.
 * @param {Record<string, unknown>} o
 */
function serializeCalendarFields(o) {
  for (const key of SIMPLE_PORTAL_DATE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
    const v = o[key];
    if (v == null || v === "") {
      o[key] = "";
      continue;
    }
    if (v instanceof Date || typeof v === "string" || typeof v === "number") {
      o[key] = toInputDateValue(v);
    }
  }

  if (Array.isArray(o.payments)) {
    o.payments = o.payments.map((p) => {
      if (!p || typeof p !== "object") return p;
      if (p.date == null || p.date === "") return { ...p, date: "" };
      if (p.date instanceof Date || typeof p.date === "string" || typeof p.date === "number") {
        return { ...p, date: toInputDateValue(p.date) };
      }
      return p;
    });
  }

  if (Array.isArray(o.lineItems)) {
    o.lineItems = o.lineItems.map((line) => {
      if (!line || typeof line !== "object") return line;
      if (line.receivedDate == null || line.receivedDate === "") {
        return { ...line, receivedDate: "" };
      }
      if (
        line.receivedDate instanceof Date ||
        typeof line.receivedDate === "string" ||
        typeof line.receivedDate === "number"
      ) {
        return { ...line, receivedDate: toInputDateValue(line.receivedDate) };
      }
      return line;
    });
  }

  return o;
}

/**
 * Normalize a lean/doc Simple portal record for JSON responses.
 * @param {Record<string, unknown>|null|undefined} doc
 */
export function serializeSimplePortalDoc(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const id = o._id != null ? String(o._id) : String(o.id || "");
  delete o._id;
  delete o.__v;
  delete o.createdByEmail;
  serializeCalendarFields(o);
  return { ...o, id };
}

/**
 * @param {string} raw
 */
export function isValidSimplePortalId(raw) {
  const id = String(raw || "").trim();
  return Boolean(id && mongoose.isValidObjectId(id));
}
