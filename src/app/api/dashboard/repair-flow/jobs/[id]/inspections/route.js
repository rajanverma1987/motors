import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairInspection from "@/models/MotorRepairInspection";

const COMPONENTS = new Set(["stator", "rotor", "field_frame", "armature", "full_motor"]);
const KINDS = new Set(["preliminary", "detailed"]);

function toPublic(row) {
  const o = row.toObject ? row.toObject() : row;
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
    const list = await MotorRepairInspection.find({ jobId: id, createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(list.map((r) => toPublic(r)));
  } catch (err) {
    console.error("repair-flow inspections GET:", err);
    return NextResponse.json({ error: "Failed to load inspections" }, { status: 500 });
  }
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
    const kind = typeof body.kind === "string" ? body.kind.trim() : "";
    const component = typeof body.component === "string" ? body.component.trim() : "";
    const findings = body.findings && typeof body.findings === "object" ? body.findings : {};

    if (!KINDS.has(kind)) {
      return NextResponse.json({ error: "kind must be preliminary or detailed" }, { status: 400 });
    }
    if (!COMPONENTS.has(component)) {
      return NextResponse.json(
        { error: "component must be stator, rotor, field_frame, armature, or full_motor" },
        { status: 400 }
      );
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await MotorRepairJob.findOne({ _id: id, createdByEmail: email });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (kind === "preliminary" && !["intake", "pre_inspection"].includes(job.phase)) {
      return NextResponse.json(
        { error: "Preliminary inspections can only be added during intake or pre-inspection" },
        { status: 400 }
      );
    }
    if (
      kind === "detailed" &&
      !["teardown_approved", "disassembly_detailed", "awaiting_final_approval"].includes(job.phase)
    ) {
      return NextResponse.json(
        { error: "Detailed inspections require approved-for-disassembly phase" },
        { status: 400 }
      );
    }

    const doc = await MotorRepairInspection.create({
      jobId: id,
      createdByEmail: email,
      kind,
      component,
      findings,
    });

    if (job.phase === "intake") {
      job.phase = "pre_inspection";
      await job.save();
    }

    return NextResponse.json({ ok: true, inspection: toPublic(doc) });
  } catch (err) {
    console.error("repair-flow inspections POST:", err);
    return NextResponse.json({ error: err.message || "Failed to save inspection" }, { status: 500 });
  }
}
