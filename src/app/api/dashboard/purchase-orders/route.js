import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";

const MAX_LINE_ITEMS = 100;
const MAX_INVOICES = 50;
const MAX_PAYMENTS = 50;

function normalizeLineItems(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_LINE_ITEMS).map((row) => ({
    description: clampString(row?.description, LIMITS.shortText.max),
    qty: clampString(String(row?.qty ?? "1"), 50),
    uom: clampString(row?.uom, 20),
    unitPrice: clampString(row?.unitPrice, 50),
    status: row?.status === "Received" ? "Received" : (row?.status === "Delivered" || row?.status === "Dispatch") ? "Dispatch" : "Ordered",
  }));
}

function normalizeVendorInvoices(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_INVOICES).map((row) => ({
    invoiceNumber: clampString(row?.invoiceNumber, 100),
    date: clampString(row?.date, 50),
    amount: clampString(row?.amount, 50),
    attachmentUrl: clampString(row?.attachmentUrl, LIMITS.url.max),
    attachmentName: clampString(row?.attachmentName, 200),
  }));
}

function normalizePayments(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_PAYMENTS).map((row) => ({
    amount: clampString(row?.amount, 50),
    date: clampString(row?.date, 50),
    method: clampString(row?.method, 100),
    reference: clampString(row?.reference, 200),
  }));
}

function sumLineItems(lines) {
  let sum = 0;
  for (const row of lines) {
    const q = parseFloat(row?.qty ?? "1");
    const p = parseFloat(row?.unitPrice ?? "0");
    if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
  }
  return sum;
}

function sumAmounts(items, key = "amount") {
  let sum = 0;
  for (const row of items) {
    const a = parseFloat(row?.[key]);
    if (Number.isFinite(a)) sum += a;
  }
  return sum;
}

/** Compute PO status from totals */
function computeStatus(totalOrder, totalInvoiced, totalPaid) {
  if (totalOrder <= 0) return "Open";
  if (totalPaid >= totalInvoiced && totalInvoiced >= totalOrder) return "Closed";
  if (totalPaid > 0 && totalPaid < totalInvoiced) return "Partially Paid";
  if (totalInvoiced >= totalOrder) return "Fully Invoiced";
  if (totalInvoiced > 0) return "Partially Invoiced";
  return "Open";
}

/** Invoiced status: Partial | Invoiced */
function computeInvoicedStatus(totalOrder, totalInvoiced) {
  if (totalOrder <= 0) return "—";
  if (totalInvoiced >= totalOrder) return "Invoiced";
  return "Partial";
}

/** Payment status: Partially | Paid */
function computePaidStatus(totalInvoiced, totalPaid) {
  if (totalInvoiced <= 0) return "—";
  if (totalPaid >= totalInvoiced) return "Paid";
  return "Partially";
}

/** Delivery status: Partial | Delivered (Delivered when all line items are Received) */
function computeDeliveryStatus(lineItems) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  if (items.length === 0) return "Partial";
  const allReceived = items.every((item) => item?.status === "Received");
  return allReceived ? "Delivered" : "Partial";
}

function toPoListItem(po, vendorNameMap = {}, quoteRfqMap = {}) {
  const lineItems = Array.isArray(po.lineItems) ? po.lineItems : [];
  const vendorInvoices = Array.isArray(po.vendorInvoices) ? po.vendorInvoices : [];
  const payments = Array.isArray(po.payments) ? po.payments : [];
  const totalOrder = sumLineItems(lineItems);
  const totalInvoiced = sumAmounts(vendorInvoices);
  const totalPaid = sumAmounts(payments);
  const status = computeStatus(totalOrder, totalInvoiced, totalPaid);
  const invoicedStatus = computeInvoicedStatus(totalOrder, totalInvoiced);
  const paidStatus = computePaidStatus(totalInvoiced, totalPaid);
  const lineItemsWithStatus = lineItems.map((item) => ({
    ...item,
    status:
      item?.status === "Received"
        ? "Received"
        : item?.status === "Back Order"
          ? "Back Order"
          : item?.status === "Delivered" || item?.status === "Dispatch"
            ? "Dispatch"
            : "Ordered",
  }));
  const deliveryStatus = computeDeliveryStatus(lineItemsWithStatus);
  return {
    id: po._id.toString(),
    poNumber: po.poNumber ?? "",
    vendorId: po.vendorId ?? "",
    type: po.type ?? "shop",
    quoteId: po.quoteId ?? "",
    vendorName: vendorNameMap[po.vendorId] ?? po.vendorId ?? "—",
    rfqNumber: quoteRfqMap[po.quoteId] ?? (po.quoteId ? "—" : ""),
    lineItems: lineItemsWithStatus,
    vendorInvoices,
    payments,
    totalOrder: totalOrder.toFixed(2),
    totalInvoiced: totalInvoiced.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    status,
    deliveryStatus,
    invoicedStatus,
    paidStatus,
    notes: po.notes ?? "",
    vendorShareToken: po.vendorShareToken ?? "",
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await PurchaseOrder.find({ createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();

    const Vendor = (await import("@/models/Vendor")).default;
    const Quote = (await import("@/models/Quote")).default;
    const vendors = await Vendor.find({ createdByEmail: email }).select("_id name").lean();
    const quotes = await Quote.find({ createdByEmail: email }).select("_id rfqNumber").lean();
    const vendorNameMap = {};
    const quoteRfqMap = {};
    for (const v of vendors) vendorNameMap[v._id.toString()] = v.name ?? "";
    for (const q of quotes) quoteRfqMap[q._id.toString()] = q.rfqNumber ?? "";

    const listWithId = list.map((po) => toPoListItem({ ...po, _id: po._id }, vendorNameMap, quoteRfqMap));
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("Dashboard list purchase orders error:", err);
    return NextResponse.json({ error: "Failed to list purchase orders" }, { status: 500 });
  }
}

/** Get next PO number for this user (e.g. P00001, P00002). */
async function getNextPoNumber(createdByEmail) {
  const list = await PurchaseOrder.find({
    createdByEmail,
    poNumber: { $regex: /^P\d+$/, $options: "i" },
  })
    .select("poNumber")
    .lean();
  let maxN = 0;
  for (const po of list) {
    const m = (po.poNumber || "").match(/^P(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxN) maxN = n;
    }
  }
  const next = maxN + 1;
  return "P" + String(next).padStart(5, "0");
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await request.json();
    const { vendorId, type, quoteId, lineItems, vendorInvoices, payments, notes } = body;
    if (!vendorId?.trim()) {
      return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();
    const poNumber = await getNextPoNumber(email);
    const typeVal = type === "job" ? "job" : "shop";
    const doc = await PurchaseOrder.create({
      poNumber,
      vendorId: vendorId.trim(),
      type: typeVal,
      quoteId: typeVal === "job" ? clampString(quoteId, 100) : "",
      lineItems: normalizeLineItems(lineItems),
      vendorInvoices: normalizeVendorInvoices(vendorInvoices ?? []),
      payments: normalizePayments(payments ?? []),
      notes: clampString(notes, LIMITS.message.max),
      createdByEmail: email,
    });
    const po = doc.toObject();
    const totalOrder = sumLineItems(po.lineItems ?? []);
    const totalInvoiced = sumAmounts(po.vendorInvoices ?? []);
    const totalPaid = sumAmounts(po.payments ?? []);
    return NextResponse.json({
      ok: true,
      purchaseOrder: {
        id: doc._id.toString(),
        poNumber: po.poNumber ?? "",
        vendorId: po.vendorId,
        type: po.type,
        quoteId: po.quoteId ?? "",
        lineItems: (po.lineItems ?? []).map((item) => ({ ...item, status: (item?.status === "Delivered" || item?.status === "Dispatch") ? "Dispatch" : "Ordered" })),
        vendorInvoices: po.vendorInvoices ?? [],
        payments: po.payments ?? [],
        totalOrder: totalOrder.toFixed(2),
        totalInvoiced: totalInvoiced.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        status: computeStatus(totalOrder, totalInvoiced, totalPaid),
        notes: po.notes ?? "",
        vendorShareToken: po.vendorShareToken ?? "",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error("Dashboard create purchase order error:", err);
    return NextResponse.json({ error: err.message || "Failed to create purchase order" }, { status: 500 });
  }
}
