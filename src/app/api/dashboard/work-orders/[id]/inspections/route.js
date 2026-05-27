import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import WorkOrder from "@/models/WorkOrder";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import {
  inspectionComponentForSave,
  normalizeInspectionFindings,
  normalizeInspectionKind,
  toPublicInspection,
} from "@/lib/motor-inspection-api";

const LEGACY_COMPONENTS = new Set(["stator", "rotor", "field_frame", "armature", "full_motor"]);

async function loadWorkOrder(id, email) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return WorkOrder.findOne({ _id: id, createdByEmail: email }).lean();
}

function inspectionQueryForWorkOrder(wo, email) {
  const woId = wo._id.toString();
  const or = [{ workOrderId: woId, createdByEmail: email }];
  const quoteId = String(wo.quoteId || "").trim();
  if (quoteId) {
    or.push({ quoteId, createdByEmail: email });
  }
  const legacyJobId = String(wo.repairFlowJobId || "").trim();
  if (legacyJobId && mongoose.isValidObjectId(legacyJobId)) {
    or.push({ jobId: legacyJobId, createdByEmail: email });
  }
  return { $or: or };
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    const email = user.email.trim().toLowerCase();
    const wo = await loadWorkOrder(id, email);
    if (!wo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const list = await MotorRepairInspection.find(inspectionQueryForWorkOrder(wo, email))
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(list.map((r) => toPublic(r)));
  } catch (err) {
    console.error("work-order inspections GET:", err);
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
    const body = await request.json().catch(() => ({}));
    const kind = normalizeInspectionKind(body.kind);
    const componentRaw = typeof body.component === "string" ? body.component.trim() : "";
    const component = LEGACY_COMPONENTS.has(componentRaw)
      ? componentRaw
      : inspectionComponentForSave();
    const findings = normalizeInspectionFindings(body);

    if (!kind) {
      return NextResponse.json({ error: "kind must be preliminary or detailed" }, { status: 400 });
    }

    const email = user.email.trim().toLowerCase();
    const wo = await loadWorkOrder(id, email);
    if (!wo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const doc = await MotorRepairInspection.create({
      workOrderId: wo._id.toString(),
      quoteId: String(wo.quoteId || "").trim(),
      jobId: String(wo.repairFlowJobId || "").trim(),
      createdByEmail: email,
      kind,
      component,
      findings,
    });

    return NextResponse.json({ ok: true, inspection: toPublic(doc) });
  } catch (err) {
    console.error("work-order inspections POST:", err);
    return NextResponse.json({ error: err.message || "Failed to save inspection" }, { status: 500 });
  }
}
