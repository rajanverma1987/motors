import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import SalesCommission from "@/models/SalesCommission";
import SalesPerson from "@/models/SalesPerson";
import MotorRepairJob from "@/models/MotorRepairJob";
import Quote from "@/models/Quote";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";
import { normalizeSalesCommissionAttachmentsFromClient } from "@/lib/dashboard-entity-attachments";
import { commissionToJson } from "@/lib/sales-commission-json";
import { computeTotalsFromLaborAndParts } from "@/lib/quote-invoice-totals";

function humanizeRepairPhase(phase) {
  const p = String(phase || "").trim();
  if (!p) return "";
  return p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function quoteGrandTotal(quote) {
  if (!quote) return null;
  const t = computeTotalsFromLaborAndParts({
    laborTotal: quote.laborTotal,
    partsTotal: quote.partsTotal,
    taxExempt: quote.customerTaxExempt,
    taxPercent: quote.customerTaxPercent,
  });
  const n = t.grandTotal;
  return Number.isFinite(n) ? n : null;
}

/** @param {Map<string, object>} quoteById @param {Map<string, object>} repairJobById */
function resolveJobSummaryForCommission(row, quoteById, repairJobById) {
  const qid = String(row.quoteId || "").trim();
  if (mongoose.isValidObjectId(qid)) {
    const quote = quoteById.get(qid);
    if (quote) {
      return {
        jobTotalAmount: quoteGrandTotal(quote),
        jobStatus: String(quote.status || "").trim() || null,
      };
    }
  }
  const rid = String(row.repairFlowJobId || "").trim();
  if (mongoose.isValidObjectId(rid)) {
    const job = repairJobById.get(rid);
    if (job) {
      let jobTotalAmount = null;
      const fq = String(job.finalFlowQuoteId || "").trim();
      const pq = String(job.preliminaryFlowQuoteId || "").trim();
      if (mongoose.isValidObjectId(fq) && quoteById.has(fq)) {
        jobTotalAmount = quoteGrandTotal(quoteById.get(fq));
      } else if (mongoose.isValidObjectId(pq) && quoteById.has(pq)) {
        jobTotalAmount = quoteGrandTotal(quoteById.get(pq));
      }
      return {
        jobTotalAmount,
        jobStatus: humanizeRepairPhase(job.phase) || null,
      };
    }
  }
  return { jobTotalAmount: null, jobStatus: null };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    const { searchParams } = new URL(request.url);
    const quoteId = clampString(searchParams.get("quoteId"), 200);
    const repairFlowJobId = clampString(searchParams.get("repairFlowJobId"), 200);
    const salesPersonId = clampString(searchParams.get("salesPersonId"), 200);
    const status = clampString(searchParams.get("status"), 20).toLowerCase();
    const statusFilter = status === "paid" || status === "unpaid" ? status : "";

    await connectDB();
    const where = { createdByEmail: owner };
    if (quoteId) where.quoteId = quoteId;
    if (repairFlowJobId) where.repairFlowJobId = repairFlowJobId;
    if (salesPersonId) {
      if (!mongoose.isValidObjectId(salesPersonId)) {
        return NextResponse.json({ error: "Invalid sales person id" }, { status: 400 });
      }
      where.salesPersonId = salesPersonId;
    }
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

    let quoteById = new Map();
    let repairJobById = new Map();
    if (salesPersonId && enriched.length > 0) {
      const quoteIdSet = new Set();
      const repairJobIdSet = new Set();
      for (const row of enriched) {
        const qid = String(row.quoteId || "").trim();
        if (mongoose.isValidObjectId(qid)) quoteIdSet.add(qid);
        const rid = String(row.repairFlowJobId || "").trim();
        if (mongoose.isValidObjectId(rid)) repairJobIdSet.add(rid);
      }
      const repairJobs =
        repairJobIdSet.size > 0
          ? await MotorRepairJob.find({
              _id: { $in: Array.from(repairJobIdSet) },
              createdByEmail: owner,
            })
              .select("phase preliminaryFlowQuoteId finalFlowQuoteId")
              .lean()
          : [];
      for (const j of repairJobs) {
        for (const ref of [j.finalFlowQuoteId, j.preliminaryFlowQuoteId]) {
          const q = String(ref || "").trim();
          if (mongoose.isValidObjectId(q)) quoteIdSet.add(q);
        }
      }
      const quoteIds = Array.from(quoteIdSet).filter((id) => mongoose.isValidObjectId(id));
      const quotes =
        quoteIds.length > 0
          ? await Quote.find({
              _id: { $in: quoteIds },
              createdByEmail: owner,
            })
              .select("laborTotal partsTotal customerTaxExempt customerTaxPercent status")
              .lean()
          : [];
      quoteById = new Map(quotes.map((q) => [String(q._id), q]));
      repairJobById = new Map(repairJobs.map((j) => [String(j._id), j]));
    }

    const commissionsPayload = enriched.map((row) => {
      const base = commissionToJson(row, { includeAttachments: false });
      if (!salesPersonId) return base;
      const { jobTotalAmount, jobStatus } = resolveJobSummaryForCommission(row, quoteById, repairJobById);
      return { ...base, jobTotalAmount, jobStatus };
    });

    return NextResponse.json({ commissions: commissionsPayload });
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
    const quoteId = clampString(body?.quoteId, 200);
    const rfqNumber = clampString(body?.rfqNumber, 200);
    const salesPersonId = clampString(body?.salesPersonId, 200);
    const amount = Number(body?.amount);
    const statusInput = clampString(body?.status, 20).toLowerCase();
    const status = statusInput === "paid" ? "paid" : "unpaid";
    const paidAtInput = clampString(body?.paidAt, 50);
    const paidAtDate = paidAtInput ? new Date(`${paidAtInput}T12:00:00.000Z`) : null;
    const attachments = normalizeSalesCommissionAttachmentsFromClient(body?.attachments ?? []);

    if (!salesPersonId) return NextResponse.json({ error: "Sales person is required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
    }

    if (repairFlowJobId) {
      if (!mongoose.isValidObjectId(repairFlowJobId)) {
        return NextResponse.json({ error: "Invalid repair job" }, { status: 400 });
      }
      const repairJob = await MotorRepairJob.findOne({ _id: repairFlowJobId, createdByEmail: owner })
        .select("jobNumber")
        .lean();
      if (!repairJob) return NextResponse.json({ error: "Repair job not found" }, { status: 404 });
      if (!jobNumber) jobNumber = String(repairJob.jobNumber || "").trim();
    }
    if (!jobNumber) {
      return NextResponse.json({ error: "Job# is required" }, { status: 400 });
    }

    const salesPerson = await SalesPerson.findOne({ _id: salesPersonId, createdByEmail: owner }).lean();
    if (!salesPerson) return NextResponse.json({ error: "Sales person not found" }, { status: 404 });

    const doc = await SalesCommission.create({
      quoteId,
      rfqNumber,
      repairFlowJobId,
      jobNumber,
      salesPersonId,
      amount,
      status,
      attachments,
      paidAt:
        status === "paid"
          ? (paidAtDate && !Number.isNaN(paidAtDate.getTime()) ? paidAtDate : new Date())
          : null,
      createdByEmail: owner,
    });

    const spName = salesPerson.name || salesPerson.email || salesPerson.phone || String(salesPerson._id);
    return NextResponse.json({
      ok: true,
      commission: commissionToJson({ ...doc.toObject(), salesPersonName: spName }, { includeAttachments: true }),
    });
  } catch (err) {
    console.error("Dashboard save sales commission error:", err);
    return NextResponse.json({ error: err.message || "Failed to save sales commission" }, { status: 500 });
  }
}
