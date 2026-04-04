import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import SalesCommission from "@/models/SalesCommission";
import SalesPerson from "@/models/SalesPerson";
import MotorRepairJob from "@/models/MotorRepairJob";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";

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
    salesPersonName: row.salesPersonName ?? "",
    amount: Number(row.amount || 0),
    status: row.status === "paid" ? "paid" : "unpaid",
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    const { searchParams } = new URL(request.url);
    const quoteId = clampString(searchParams.get("quoteId"), 200);
    const repairFlowJobId = clampString(searchParams.get("repairFlowJobId"), 200);
    const status = clampString(searchParams.get("status"), 20).toLowerCase();
    const statusFilter = status === "paid" || status === "unpaid" ? status : "";

    await connectDB();
    const where = { createdByEmail: owner };
    if (quoteId) where.quoteId = quoteId;
    if (repairFlowJobId) where.repairFlowJobId = repairFlowJobId;
    if (statusFilter) where.status = statusFilter;

    const [rows, salesPeople] = await Promise.all([
      SalesCommission.find(where).sort({ createdAt: -1 }).lean(),
      SalesPerson.find({ createdByEmail: owner }).select("_id name email phone").lean(),
    ]);
    const salesPersonNameMap = {};
    for (const sp of salesPeople) {
      salesPersonNameMap[String(sp._id)] = sp.name || sp.email || sp.phone || String(sp._id);
    }
    const enriched = rows.map((row) => ({
      ...row,
      salesPersonName: salesPersonNameMap[String(row.salesPersonId)] || "",
    }));
    return NextResponse.json({ commissions: enriched.map((row) => toJson(row)) });
  } catch (err) {
    console.error("Dashboard get sales commission error:", err);
    return NextResponse.json({ error: "Failed to load sales commission" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    await connectDB();
    const body = await request.json();
    let repairFlowJobId = clampString(body?.repairFlowJobId, 200);
    let jobNumber = clampString(body?.jobNumber, 200);
    const salesPersonId = clampString(body?.salesPersonId, 200);
    const amount = Number(body?.amount);

    if (!repairFlowJobId || !mongoose.isValidObjectId(repairFlowJobId)) {
      return NextResponse.json({ error: "Repair job is required" }, { status: 400 });
    }
    if (!salesPersonId) return NextResponse.json({ error: "Sales person is required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }

    const repairJob = await MotorRepairJob.findOne({ _id: repairFlowJobId, createdByEmail: owner })
      .select("jobNumber")
      .lean();
    if (!repairJob) return NextResponse.json({ error: "Repair job not found" }, { status: 404 });
    if (!jobNumber) jobNumber = String(repairJob.jobNumber || "").trim();
    if (!jobNumber) {
      return NextResponse.json({ error: "Job# missing on repair job" }, { status: 400 });
    }

    const salesPerson = await SalesPerson.findOne({ _id: salesPersonId, createdByEmail: owner }).lean();
    if (!salesPerson) return NextResponse.json({ error: "Sales person not found" }, { status: 404 });

    const doc = await SalesCommission.create({
      quoteId: "",
      rfqNumber: "",
      repairFlowJobId,
      jobNumber,
      salesPersonId,
      amount,
      status: "unpaid",
      paidAt: null,
      createdByEmail: owner,
    });

    return NextResponse.json({ ok: true, commission: toJson(doc) });
  } catch (err) {
    console.error("Dashboard save sales commission error:", err);
    return NextResponse.json({ error: err.message || "Failed to save sales commission" }, { status: 500 });
  }
}
