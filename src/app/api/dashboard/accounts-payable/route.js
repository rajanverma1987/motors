import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import Vendor from "@/models/Vendor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  poBalanceDue,
  poLineOrderTotal,
  sumVendorInvoiced,
  sumVendorPayments,
  latestVendorInvoiceDate,
  daysSinceApAnchor,
  apAgingBucket,
  computePoStatus,
} from "@/lib/po-payable";

/**
 * GET ?include=due|open|closed|all
 * - due: vendor invoiced amount > payments (balance due > 0)
 * - open: PO status !== Closed (commitments / partial flow)
 * - closed: fully settled (Closed)
 * - all: all POs
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const include = String(searchParams.get("include") || "due").toLowerCase();

    await connectDB();
    const list = await PurchaseOrder.find({ createdByEmail: email }).sort({ createdAt: -1 }).lean();
    const vendorIds = [...new Set(list.map((p) => String(p.vendorId)).filter(Boolean))];
    const vendors = await Vendor.find({ _id: { $in: vendorIds }, createdByEmail: email })
      .select("_id name")
      .lean();
    const vendorMap = Object.fromEntries(
      (vendors || []).map((v) => [String(v._id), (v.name || "").trim() || String(v._id)])
    );

    const row = (po) => {
      const order = poLineOrderTotal(po);
      const invoiced = sumVendorInvoiced(po);
      const paid = sumVendorPayments(po);
      const balanceDue = poBalanceDue(po);
      const status = computePoStatus(order, invoiced, paid);
      const invDate = latestVendorInvoiceDate(po);
      const days = daysSinceApAnchor(invDate, po.createdAt);
      return {
        id: po._id.toString(),
        poNumber: po.poNumber || "",
        vendorId: String(po.vendorId || ""),
        vendorName: vendorMap[String(po.vendorId)] || po.vendorId || "—",
        quoteId: po.quoteId || "",
        type: po.type || "shop",
        orderTotal: order,
        invoiced,
        paid,
        balanceDue,
        status,
        lastVendorInvoiceDate: invDate || "",
        daysOutstanding: days,
        agingBucket: apAgingBucket(days),
        paymentCount: Array.isArray(po.payments) ? po.payments.length : 0,
        vendorInvoiceCount: Array.isArray(po.vendorInvoices) ? po.vendorInvoices.length : 0,
      };
    };

    const allRows = list.map(row);

    const dueRows = allRows.filter((r) => r.balanceDue > 0.009);
    const openRows = allRows.filter((r) => r.status !== "Closed");
    const closedRows = allRows.filter((r) => r.status === "Closed");

    let rows;
    if (include === "due") rows = dueRows;
    else if (include === "open") rows = openRows;
    else if (include === "closed") rows = closedRows;
    else rows = allRows;

    const totalPayable = Math.round(dueRows.reduce((s, r) => s + r.balanceDue, 0) * 100) / 100;
    const dueCount = dueRows.length;
    const overdueCount = dueRows.filter((r) => r.daysOutstanding != null && r.daysOutstanding > 30).length;

    return NextResponse.json({
      summary: {
        totalPayable,
        dueCount,
        overdueCount,
        openPoCount: openRows.length,
      },
      rows,
    });
  } catch (err) {
    console.error("Accounts payable GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
