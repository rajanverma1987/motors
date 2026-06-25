import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import PurchaseOrder from "@/models/PurchaseOrder";
import Vendor from "@/models/Vendor";
import OtherTaxPayment from "@/models/OtherTaxPayment";
import { poGrandTotal, sumVendorPayments } from "@/lib/po-payable";
import { sumPoLineTaxAmount } from "@/lib/po-line-item-totals";

function toNum(v) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(v) {
  return Math.round((toNum(v) + Number.EPSILON) * 100) / 100;
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    await connectDB();

    const [purchaseOrders, vendors, otherPayments] = await Promise.all([
      PurchaseOrder.find({ createdByEmail: email }).sort({ createdAt: -1 }).lean(),
      Vendor.find({ createdByEmail: email }).select("_id name").lean(),
      OtherTaxPayment.find({ createdByEmail: email }).sort({ paidDate: -1, createdAt: -1 }).lean(),
    ]);

    const vendorMap = Object.fromEntries((vendors || []).map((v) => [String(v._id), v.name || String(v._id)]));

    const taxPaid = [];
    let sumPoAmount = 0;
    let sumTaxPaid = 0;

    for (const po of purchaseOrders || []) {
      const lines = Array.isArray(po.lineItems) ? po.lineItems : [];
      const totalIncl = round2(poGrandTotal(po));
      const totalTax = round2(sumPoLineTaxAmount(lines));
      const paid = round2(sumVendorPayments(po));
      if (paid <= 0 || totalTax <= 0.005) continue;
      const taxRatio = totalIncl > 0 ? totalTax / totalIncl : 0;
      const taxPaidOnPo = round2(paid * taxRatio);
      taxPaid.push({
        id: String(po._id),
        poNumber: po.poNumber || "—",
        vendorName: vendorMap[String(po.vendorId)] || String(po.vendorId || "—"),
        poAmount: totalIncl,
        taxPaid: taxPaidOnPo,
      });
      sumPoAmount += totalIncl;
      sumTaxPaid += taxPaidOnPo;
    }

    const other = (otherPayments || []).map((p) => ({
      id: p._id.toString(),
      taxType: p.taxType,
      taxPeriod: p.taxPeriod || "",
      paidDate: p.paidDate,
      paidAmount: round2(p.paidAmount),
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      taxPaid: {
        rows: taxPaid,
        summary: {
          poAmount: round2(sumPoAmount),
          taxPaid: round2(sumTaxPaid),
        },
      },
      otherTaxPayments: other,
    });
  } catch (err) {
    console.error("Taxes GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load taxes" }, { status: 500 });
  }
}
