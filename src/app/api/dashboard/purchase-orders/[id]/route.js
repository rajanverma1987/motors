import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import Vendor from "@/models/Vendor";
import { poBalanceDue } from "@/lib/po-payable";
import {
  normalizePurchaseOrderLineItems,
  normalizeLineItemStatus,
} from "@/lib/purchase-order-line-items";

const MAX_INVOICES = 50;
const MAX_PAYMENTS = 50;

function computeDeliveryStatus(lineItems) {
  const items = Array.isArray(lineItems) ? lineItems : [];
  if (items.length === 0) return "Partial";
  const allReceived = items.every((item) => item?.status === "Received");
  return allReceived ? "Delivered" : "Partial";
}

function computeInvoicedStatus(totalOrder, totalInvoiced) {
  if (totalOrder <= 0) return "—";
  if (totalInvoiced >= totalOrder) return "Invoiced";
  return "Partial";
}

function computePaidStatus(totalInvoiced, totalPaid) {
  if (totalInvoiced <= 0) return "—";
  if (totalPaid >= totalInvoiced) return "Paid";
  return "Partially";
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

function computeStatus(totalOrder, totalInvoiced, totalPaid) {
  if (totalOrder <= 0) return "Open";
  if (totalPaid >= totalInvoiced && totalInvoiced >= totalOrder) return "Closed";
  if (totalPaid > 0 && totalPaid < totalInvoiced) return "Partially Paid";
  if (totalInvoiced >= totalOrder) return "Fully Invoiced";
  if (totalInvoiced > 0) return "Partially Invoiced";
  return "Open";
}

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await PurchaseOrder.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : [];
    const vendorInvoices = Array.isArray(doc.vendorInvoices) ? doc.vendorInvoices : [];
    const payments = Array.isArray(doc.payments) ? doc.payments : [];
    const totalOrder = sumLineItems(lineItems);
    const totalInvoiced = sumAmounts(vendorInvoices);
    const totalPaid = sumAmounts(payments);
    const lineItemsWithStatus = lineItems.map((item) => ({
      ...item,
      status: normalizeLineItemStatus(item),
    }));
    const deliveryStatus = computeDeliveryStatus(lineItemsWithStatus);
    const invoicedStatus = computeInvoicedStatus(totalOrder, totalInvoiced);
    const paidStatus = computePaidStatus(totalInvoiced, totalPaid);
    const balanceDue = poBalanceDue(doc);
    const vendorDoc = doc.vendorId
      ? await Vendor.findOne({
          _id: doc.vendorId,
          createdByEmail: user.email.trim().toLowerCase(),
        })
          .select("name")
          .lean()
      : null;
    const out = {
      id: doc._id.toString(),
      poNumber: doc.poNumber ?? "",
      vendorId: doc.vendorId ?? "",
      vendorName: vendorDoc?.name?.trim() || doc.vendorId || "—",
      type: doc.type ?? "shop",
      quoteId: doc.quoteId ?? "",
      lineItems: lineItemsWithStatus,
      vendorInvoices,
      payments,
      totalOrder: totalOrder.toFixed(2),
      totalInvoiced: totalInvoiced.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      status: computeStatus(totalOrder, totalInvoiced, totalPaid),
      balanceDue,
      deliveryStatus,
      invoicedStatus,
      paidStatus,
      notes: doc.notes ?? "",
      vendorShareToken: doc.vendorShareToken ?? "",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return NextResponse.json(out);
  } catch (err) {
    console.error("Dashboard get purchase order error:", err);
    return NextResponse.json({ error: "Failed to load purchase order" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await PurchaseOrder.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const { vendorId, type, quoteId, lineItems, vendorInvoices, payments, notes, ensureVendorShareToken } = body;
    if (ensureVendorShareToken && !doc.vendorShareToken?.trim()) {
      let token;
      let exists = true;
      for (let i = 0; i < 5; i++) {
        token = randomBytes(24).toString("hex");
        const existing = await PurchaseOrder.findOne({ vendorShareToken: token }).lean();
        if (!existing) {
          exists = false;
          break;
        }
      }
      if (!exists && token) doc.vendorShareToken = token;
      else doc.vendorShareToken = randomBytes(24).toString("hex");
    }
    if (vendorId !== undefined) {
      if (!String(vendorId).trim()) {
        return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
      }
      doc.vendorId = vendorId.trim();
    }
    if (type !== undefined) doc.type = type === "job" ? "job" : "shop";
    if (quoteId !== undefined) doc.quoteId = doc.type === "job" ? clampString(quoteId, 100) : "";
    if (lineItems !== undefined) {
      doc.lineItems = normalizePurchaseOrderLineItems(lineItems);
      doc.markModified("lineItems");
    }
    if (vendorInvoices !== undefined) {
      doc.vendorInvoices = normalizeVendorInvoices(vendorInvoices);
      doc.markModified("vendorInvoices");
    }
    if (payments !== undefined) {
      doc.payments = normalizePayments(payments);
      doc.markModified("payments");
    }
    if (notes !== undefined) doc.notes = clampString(notes, LIMITS.message.max);
    await doc.save();
    const po = doc.toObject();
    const totalOrder = sumLineItems(po.lineItems ?? []);
    const totalInvoiced = sumAmounts(po.vendorInvoices ?? []);
    const totalPaid = sumAmounts(po.payments ?? []);
    return NextResponse.json({
      ok: true,
      purchaseOrder: {
        id: doc._id.toString(),
        poNumber: doc.poNumber ?? "",
        vendorId: po.vendorId,
        type: po.type,
        quoteId: po.quoteId ?? "",
        lineItems: (po.lineItems ?? []).map((item) => ({ ...item, status: normalizeLineItemStatus(item) })),
        vendorInvoices: po.vendorInvoices ?? [],
        payments: po.payments ?? [],
        totalOrder: totalOrder.toFixed(2),
        totalInvoiced: totalInvoiced.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        status: computeStatus(totalOrder, totalInvoiced, totalPaid),
        deliveryStatus: computeDeliveryStatus(
          (po.lineItems ?? []).map((item) => ({ ...item, status: normalizeLineItemStatus(item) }))
        ),
        invoicedStatus: computeInvoicedStatus(totalOrder, totalInvoiced),
        paidStatus: computePaidStatus(totalInvoiced, totalPaid),
        notes: po.notes ?? "",
        vendorShareToken: doc.vendorShareToken ?? "",
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error("Dashboard update purchase order error:", err);
    return NextResponse.json({ error: err.message || "Failed to update purchase order" }, { status: 500 });
  }
}
