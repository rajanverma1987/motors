import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import Quote from "@/models/Quote";
import { crmQuoteToFlowQuoteShape } from "@/lib/repair-flow-crm-quote-row";

function toPublic(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id.toString(), _id: undefined };
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid job" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await MotorRepairJob.findOne({ _id: id, createdByEmail: email }).lean();
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const jobIdStr = String(id);
    const rows = [];

    const prelimId = String(job.preliminaryFlowQuoteId || "").trim();
    if (prelimId && mongoose.isValidObjectId(prelimId)) {
      const pq = await MotorRepairFlowQuote.findOne({ _id: prelimId, createdByEmail: email }).lean();
      if (pq) {
        const link = await Quote.findOne({
          createdByEmail: email,
          motorRepairFlowQuoteId: prelimId,
        })
          .select({ _id: 1, rfqNumber: 1 })
          .lean();
        const pub = toPublic(pq);
        rows.push({
          ...pub,
          source: "flow",
          crmQuoteId: link?._id ? link._id.toString() : null,
          crmRfqNumber: link?.rfqNumber ?? null,
        });
      }
    }

    const crmList = await Quote.find({
      createdByEmail: email,
      repairFlowJobId: jobIdStr,
    })
      .sort({ createdAt: 1 })
      .lean();

    const crmIds = new Set(crmList.map((q) => q._id.toString()));

    const finalFid = String(job.finalFlowQuoteId || "").trim();
    if (finalFid && mongoose.isValidObjectId(finalFid) && !crmIds.has(finalFid)) {
      const primaryCrm = await Quote.findOne({ _id: finalFid, createdByEmail: email }).lean();
      if (primaryCrm) {
        crmList.push(primaryCrm);
        crmIds.add(finalFid);
      }
    }
    if (finalFid && mongoose.isValidObjectId(finalFid)) {
      const legacyFlowFinal = await MotorRepairFlowQuote.findOne({
        _id: finalFid,
        createdByEmail: email,
        stage: "final",
      })
        .select({ _id: 1 })
        .lean();
      if (legacyFlowFinal) {
        const linked = await Quote.findOne({
          createdByEmail: email,
          motorRepairFlowQuoteId: finalFid,
        }).lean();
        if (linked && !crmIds.has(linked._id.toString())) {
          crmList.push(linked);
          crmIds.add(linked._id.toString());
        }
      }
    }

    crmList.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    for (const qdoc of crmList) {
      rows.push(crmQuoteToFlowQuoteShape(qdoc, job));
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error("flow-quotes GET:", err);
    return NextResponse.json({ error: "Failed to load quotes" }, { status: 500 });
  }
}
