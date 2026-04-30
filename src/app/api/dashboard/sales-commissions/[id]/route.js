import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SalesCommission from "@/models/SalesCommission";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function toJson(doc) {
  const row = doc && (doc.toObject ? doc.toObject() : doc);
  if (!row) return null;
  return {
    id: row._id?.toString(),
    quoteId: row.quoteId ?? "",
    rfqNumber: row.rfqNumber ?? "",
    repairFlowJobId: row.repairFlowJobId ?? "",
    jobNumber: row.jobNumber ?? "",
    salesPersonId: row.salesPersonId ?? "",
    amount: Number(row.amount || 0),
    status: row.status === "paid" ? "paid" : "unpaid",
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await connectDB();
    const doc = await SalesCommission.findOne({ _id: id, createdByEmail: owner });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const nextStatus = String(body?.status || "").trim().toLowerCase();
    const status = nextStatus === "paid" ? "paid" : "unpaid";
    const salesPersonId = clampString(body?.salesPersonId, 200);
    const jobNumber = clampString(body?.jobNumber, 200);
    const quoteId = clampString(body?.quoteId, 200);
    const rfqNumber = clampString(body?.rfqNumber, 200);
    const amountNum = Number(body?.amount);
    const paidAtInput = clampString(body?.paidAt, 50);
    const paidAtDate = paidAtInput ? new Date(`${paidAtInput}T12:00:00.000Z`) : null;

    if (!salesPersonId) {
      return NextResponse.json({ error: "Sales person is required" }, { status: 400 });
    }
    if (!jobNumber) {
      return NextResponse.json({ error: "Job# is required" }, { status: 400 });
    }
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }

    doc.salesPersonId = salesPersonId;
    doc.jobNumber = jobNumber;
    doc.quoteId = quoteId;
    doc.rfqNumber = rfqNumber;
    doc.amount = amountNum;
    doc.status = status;
    doc.paidAt = status === "paid"
      ? (paidAtDate && !Number.isNaN(paidAtDate.getTime()) ? paidAtDate : new Date())
      : null;
    await doc.save();

    return NextResponse.json({ ok: true, commission: toJson(doc) });
  } catch (err) {
    console.error("Dashboard update sales commission status error:", err);
    return NextResponse.json({ error: err.message || "Failed to update sales commission" }, { status: 500 });
  }
}
