import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import Quote from "@/models/Quote";
import { executionStagesInitial } from "@/lib/repair-flow-constants";

function toPublic(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id.toString(), _id: undefined };
}

export async function POST(request, context) {
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
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action.trim() : "";

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await MotorRepairJob.findOne({ _id: id, createdByEmail: email });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const loadFlowQuote = async (qid) => {
      if (!qid || !mongoose.isValidObjectId(qid)) return null;
      return MotorRepairFlowQuote.findOne({ _id: qid, createdByEmail: email });
    };

    const loadFinalForAdvance = async (finalIdRaw) => {
      const finalId = String(finalIdRaw || "").trim();
      if (!finalId || !mongoose.isValidObjectId(finalId)) return { kind: null, doc: null };
      const crm = await Quote.findOne({ _id: finalId, createdByEmail: email });
      if (crm) return { kind: "crm", doc: crm };
      const flow = await MotorRepairFlowQuote.findOne({ _id: finalId, createdByEmail: email });
      if (flow) return { kind: "flow", doc: flow };
      return { kind: null, doc: null };
    };

    switch (action) {
      case "approve_preliminary": {
        if (job.phase !== "awaiting_preliminary_approval") {
          return NextResponse.json({ error: "Job is not awaiting preliminary approval" }, { status: 400 });
        }
        const q = await loadFlowQuote(job.preliminaryFlowQuoteId);
        if (!q) {
          return NextResponse.json({ error: "Preliminary quote not found" }, { status: 400 });
        }
        q.status = "approved";
        await q.save();
        job.phase = "teardown_approved";
        await job.save();
        break;
      }
      case "reject_preliminary": {
        if (job.phase !== "awaiting_preliminary_approval") {
          return NextResponse.json({ error: "Job is not awaiting preliminary approval" }, { status: 400 });
        }
        const q = await loadFlowQuote(job.preliminaryFlowQuoteId);
        if (q) {
          q.status = "rejected";
          await q.save();
        }
        job.phase = "closed_returned";
        await job.save();
        break;
      }
      case "scrap_preliminary": {
        if (job.phase !== "awaiting_preliminary_approval") {
          return NextResponse.json({ error: "Job is not awaiting preliminary approval" }, { status: 400 });
        }
        const q = await loadFlowQuote(job.preliminaryFlowQuoteId);
        if (q) {
          q.status = "rejected";
          await q.save();
        }
        job.phase = "closed_scrap";
        await job.save();
        break;
      }
      case "start_disassembly": {
        if (job.phase !== "teardown_approved") {
          return NextResponse.json({ error: "Approve preliminary quote first" }, { status: 400 });
        }
        job.phase = "disassembly_detailed";
        await job.save();
        break;
      }
      case "approve_final": {
        if (job.phase !== "awaiting_final_approval") {
          return NextResponse.json({ error: "Job is not awaiting final approval" }, { status: 400 });
        }
        const { kind, doc: fq } = await loadFinalForAdvance(job.finalFlowQuoteId);
        if (!fq) {
          return NextResponse.json({ error: "Final quote not found" }, { status: 400 });
        }
        if (kind === "crm") {
          if (!Array.isArray(fq.statusLog)) fq.statusLog = [];
          fq.statusLog.push({
            from: fq.status || "draft",
            to: "approved",
            at: new Date(),
            by: (user.contactName && user.contactName.trim()) || (user.shopName && user.shopName.trim()) || user.email?.trim() || "",
          });
          fq.markModified("statusLog");
          fq.status = "approved";
          await fq.save();
        } else if (kind === "flow") {
          fq.status = "locked";
          await fq.save();
        }
        job.phase = "work_execution";
        if (!job.executionStages?.length) {
          job.executionStages = executionStagesInitial();
        }
        await job.save();
        break;
      }
      case "reject_final": {
        if (job.phase !== "awaiting_final_approval") {
          return NextResponse.json({ error: "Job is not awaiting final approval" }, { status: 400 });
        }
        const { kind, doc: fq } = await loadFinalForAdvance(job.finalFlowQuoteId);
        if (kind === "crm" && fq) {
          if (!Array.isArray(fq.statusLog)) fq.statusLog = [];
          fq.statusLog.push({
            from: fq.status || "draft",
            to: "rejected",
            at: new Date(),
            by: (user.contactName && user.contactName.trim()) || (user.shopName && user.shopName.trim()) || user.email?.trim() || "",
          });
          fq.markModified("statusLog");
          fq.status = "rejected";
          await fq.save();
        } else if (kind === "flow" && fq) {
          fq.status = "rejected";
          await fq.save();
        }
        job.phase = "closed_returned";
        await job.save();
        break;
      }
      case "complete_job": {
        if (!["work_execution", "testing_qa"].includes(job.phase)) {
          return NextResponse.json(
            { error: "Job must be in work execution (or testing & QA for legacy jobs)" },
            { status: 400 }
          );
        }
        job.phase = "completed";
        await job.save();
        break;
      }
      default:
        return NextResponse.json(
          {
            error:
              "Unknown action. Use approve_preliminary, reject_preliminary, scrap_preliminary, start_disassembly, approve_final, reject_final, complete_job.",
          },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, job: toPublic(job) });
  } catch (err) {
    console.error("repair-flow advance:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
