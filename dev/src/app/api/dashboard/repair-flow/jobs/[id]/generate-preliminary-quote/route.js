import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import { buildPreliminaryQuoteFromInspections } from "@/lib/repair-flow-preliminary-quote";
import { clampString } from "@/lib/validation";
import { sanitizeFlowQuoteLineItems } from "@/lib/repair-flow-sanitize-line-items";

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

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await MotorRepairJob.findOne({ _id: id, createdByEmail: email });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!["intake", "pre_inspection"].includes(job.phase)) {
      return NextResponse.json(
        { error: "Job must be in intake or pre-inspection to generate a preliminary quote" },
        { status: 400 }
      );
    }
    if (job.preliminaryFlowQuoteId) {
      return NextResponse.json(
        { error: "Preliminary quote already exists for this job" },
        { status: 400 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    let lineItems;
    let quoteNotes;

    if (Array.isArray(rawBody.lineItems) && rawBody.lineItems.length > 0) {
      lineItems = sanitizeFlowQuoteLineItems(rawBody.lineItems);
      if (lineItems.length === 0) {
        return NextResponse.json({ error: "At least one scope or cost line with a description is required" }, { status: 400 });
      }
      quoteNotes = clampString(typeof rawBody.quoteNotes === "string" ? rawBody.quoteNotes : "", 8000);
    } else {
      const inspections = await MotorRepairInspection.find({
        jobId: id,
        createdByEmail: email,
        kind: "preliminary",
      }).lean();

      if (inspections.length === 0) {
        return NextResponse.json(
          {
            error:
              "Add at least one pre-inspection on this job, or open Create Preliminary Quote and enter scope lines manually",
          },
          { status: 400 }
        );
      }
      const built = buildPreliminaryQuoteFromInspections(
        inspections.map((r) => ({ component: r.component, findings: r.findings || {} }))
      );
      lineItems = built.lineItems;
      quoteNotes = built.quoteNotes;
    }

    const subtotal = lineItems.reduce(
      (s, li) => s + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
      0
    );

    const quote = await MotorRepairFlowQuote.create({
      jobId: id,
      createdByEmail: email,
      stage: "preliminary",
      status: "waiting_approval",
      lineItems,
      subtotal,
      quoteNotes,
    });

    job.preliminaryFlowQuoteId = quote._id.toString();
    job.phase = "awaiting_preliminary_approval";
    await job.save();

    return NextResponse.json({
      ok: true,
      job: toPublic(job),
      quote: toPublic(quote),
    });
  } catch (err) {
    console.error("generate-preliminary-quote:", err);
    return NextResponse.json({ error: err.message || "Failed to generate quote" }, { status: 500 });
  }
}
