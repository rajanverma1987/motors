import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  poBalanceDue,
  poGrandTotal,
  sumVendorInvoiced,
  sumVendorPayments,
  computePoStatus,
} from "@/lib/po-payable";
import {
  computePoDeliveryStatus,
  computePoInvoicedStatus,
  computePoPaidStatus,
} from "@/lib/po-status";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function parseAmount(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const vendorId = String(params?.id || "").trim();
    if (!vendorId) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await PurchaseOrder.find({ createdByEmail: email, vendorId })
      .sort({ createdAt: -1 })
      .lean();

    const purchaseOrders = [];
    const vendorInvoices = [];
    const payments = [];

    for (const po of list) {
      const id = po._id.toString();
      const orderTotal = poGrandTotal(po);
      const invoiced = sumVendorInvoiced(po);
      const paid = sumVendorPayments(po);
      const balanceDue = poBalanceDue(po);
      const status = computePoStatus(orderTotal, invoiced, paid);
      const invoicedStatus = computePoInvoicedStatus(orderTotal, invoiced);
      const paidStatus = computePoPaidStatus(invoiced, paid, orderTotal);
      const deliveryStatus = computePoDeliveryStatus(
        Array.isArray(po.lineItems) ? po.lineItems : []
      );

      purchaseOrders.push({
        id,
        poNumber: po.poNumber || "",
        orderTotal,
        invoiced,
        paid,
        balanceDue,
        status,
        invoicedStatus,
        paidStatus,
        deliveryStatus,
        createdAt: po.createdAt,
      });

      for (const inv of Array.isArray(po.vendorInvoices) ? po.vendorInvoices : []) {
        vendorInvoices.push({
          poId: id,
          poNumber: po.poNumber || "",
          invoiceNumber: inv?.invoiceNumber || "",
          date: inv?.date || "",
          amount: parseAmount(inv?.amount),
        });
      }

      for (const pay of Array.isArray(po.payments) ? po.payments : []) {
        payments.push({
          poId: id,
          poNumber: po.poNumber || "",
          date: pay?.date || "",
          amount: parseAmount(pay?.amount),
          method: pay?.method || "",
          reference: pay?.reference || "",
        });
      }
    }

    vendorInvoices.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    payments.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return NextResponse.json({ purchaseOrders, vendorInvoices, payments });
  } catch (err) {
    console.error("Vendor activity GET:", err);
    return NextResponse.json({ error: err.message || "Failed to load vendor activity" }, { status: 500 });
  }
}
