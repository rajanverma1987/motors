import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import { applyMotorNameplateFields, motorNameplateFromLean } from "@/lib/motor-nameplate-patch";

function toPublicJob(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const { preliminaryRespondToken: _dropToken, _id, ...rest } = o;
  return {
    ...rest,
    id: _id.toString(),
  };
}

async function loadJobForShop(id, email) {
  if (!mongoose.isValidObjectId(id)) return null;
  return MotorRepairJob.findOne({ _id: id, createdByEmail: email }).lean();
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    await connectDB();
    const email = user.email.trim().toLowerCase();
    let job = await loadJobForShop(id, email);
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const jobIdStr = String(job._id);
    const attExisting = Array.isArray(job.attachments) ? job.attachments : [];
    if (attExisting.length === 0) {
      const quoteRows = await Quote.find({
        createdByEmail: email,
        repairFlowJobId: jobIdStr,
      })
        .select({ attachments: 1 })
        .lean();
      const merged = [];
      const seen = new Set();
      for (const q of quoteRows) {
        for (const a of q.attachments || []) {
          const url = String(a?.url ?? "").trim();
          if (!url || seen.has(url)) continue;
          seen.add(url);
          merged.push({
            url,
            name: String(a?.name ?? "").trim() || url,
          });
        }
      }
      if (merged.length > 0) {
        await MotorRepairJob.updateOne(
          { _id: job._id, createdByEmail: email },
          { $set: { attachments: merged.slice(0, 50) } }
        );
        job = await loadJobForShop(id, email);
      }
    }

    const [customer, motor] = await Promise.all([
      Customer.findOne({ _id: job.customerId, createdByEmail: email }).lean(),
      Motor.findOne({ _id: job.motorId, createdByEmail: email }).lean(),
    ]);
    return NextResponse.json({
      job: {
        ...toPublicJob(job),
        customerLabel: customer ? customer.companyName || customer.primaryContactName || "" : "",
        customerHasEmail: !!(customer?.email && String(customer.email).trim()),
        motorLabel: motor
          ? `${motor.manufacturer || ""} ${motor.model || ""}`.trim() || motor.serialNumber || "Motor"
          : "",
        motorType: motor?.motorType || "",
        motorNameplate: motorNameplateFromLean(motor),
      },
    });
  } catch (err) {
    console.error("repair-flow job GET:", err);
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    const body = await request.json().catch(() => ({}));

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await MotorRepairJob.findOne({ _id: id, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const editableCustomerMotorPhases = [
      "intake",
      "pre_inspection",
      "teardown_approved",
      "disassembly_detailed",
      "final_quote",
    ];
    if (editableCustomerMotorPhases.includes(doc.phase)) {
      const cid = typeof body.customerId === "string" ? body.customerId.trim() : "";
      if (cid && mongoose.isValidObjectId(cid)) {
        const cust = await Customer.findOne({ _id: cid, createdByEmail: email });
        if (cust) doc.customerId = cid;
      }
      const mid = typeof body.motorId === "string" ? body.motorId.trim() : "";
      if (mid && mongoose.isValidObjectId(mid)) {
        const mot = await Motor.findOne({ _id: mid, createdByEmail: email });
        if (mot && String(mot.customerId) === String(doc.customerId)) {
          doc.motorId = mid;
        }
      }
    }

    const intakeEditablePhases = ["intake", "pre_inspection"];
    if (intakeEditablePhases.includes(doc.phase)) {
      if (typeof body.complaint === "string") doc.complaint = body.complaint.trim().slice(0, 8000);
      if (typeof body.nameplateSummary === "string") doc.nameplateSummary = body.nameplateSummary.trim().slice(0, 4000);
      if (typeof body.intakeNotes === "string") doc.intakeNotes = body.intakeNotes.trim().slice(0, 8000);
      if (Array.isArray(body.intakePhotoUrls)) {
        doc.intakePhotoUrls = body.intakePhotoUrls.map((u) => String(u || "").trim()).filter(Boolean).slice(0, 20);
      }
      if (body.moveToPreInspection === true && doc.phase === "intake") {
        doc.phase = "pre_inspection";
      }
      if (body.motorUpdates && typeof body.motorUpdates === "object") {
        const motorDoc = await Motor.findOne({ _id: doc.motorId, createdByEmail: email });
        if (motorDoc) {
          applyMotorNameplateFields(motorDoc, body.motorUpdates);
          await motorDoc.save();
        }
      }
    }

    if (typeof body.qaPassed === "boolean" && ["testing_qa", "work_execution"].includes(doc.phase)) {
      doc.qaPassed = body.qaPassed;
    }
    if (typeof body.qaNotes === "string" && doc.phase === "testing_qa") {
      doc.qaNotes = body.qaNotes.trim().slice(0, 4000);
    }
    if (typeof body.finalTestSummary === "string" && doc.phase === "testing_qa") {
      doc.finalTestSummary = body.finalTestSummary.trim().slice(0, 8000);
    }

    if (Array.isArray(body.executionStages) && doc.phase === "work_execution") {
      doc.executionStages = body.executionStages
        .map((s) => ({
          key: String(s?.key || "").trim(),
          status: ["pending", "in_progress", "done"].includes(s?.status) ? s.status : "pending",
          notes: String(s?.notes || "").trim().slice(0, 8000),
          updatedAt: new Date(),
        }))
        .filter((s) => s.key);
    }

    if (body.attachments !== undefined && Array.isArray(body.attachments)) {
      doc.attachments = body.attachments
        .map((a) => ({
          url: String(a?.url ?? "").trim(),
          name: String(a?.name ?? "").trim(),
        }))
        .filter((a) => a.url)
        .slice(0, 50);
    }

    await doc.save();
    return NextResponse.json({ ok: true, job: toPublicJob(doc) });
  } catch (err) {
    console.error("repair-flow job PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
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
    const job = await MotorRepairJob.findOne({ _id: id, createdByEmail: email });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const jobIdStr = String(id);
    const finalIdRaw = String(job.finalFlowQuoteId || "").trim();
    const quoteDeleteFilter = mongoose.isValidObjectId(finalIdRaw)
      ? {
          createdByEmail: email,
          $or: [{ repairFlowJobId: jobIdStr }, { _id: finalIdRaw }],
        }
      : { createdByEmail: email, repairFlowJobId: jobIdStr };
    await Promise.all([
      MotorRepairInspection.deleteMany({ jobId: jobIdStr, createdByEmail: email }),
      MotorRepairFlowQuote.deleteMany({ jobId: jobIdStr, createdByEmail: email }),
      Quote.deleteMany(quoteDeleteFilter),
    ]);
    await MotorRepairJob.deleteOne({ _id: id, createdByEmail: email });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("repair-flow job DELETE:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
