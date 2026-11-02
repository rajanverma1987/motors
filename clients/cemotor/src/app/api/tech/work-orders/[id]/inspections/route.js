import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import WorkOrder from "@/models/WorkOrder";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import {
  inspectionComponentForSave,
  normalizeInspectionFindings,
  normalizeInspectionKind,
  toPublicInspection,
} from "@/lib/motor-inspection-api";
import { isWorkOrderOpenStatus } from "@/lib/work-order-open-status";

const LEGACY_COMPONENTS = new Set(["stator", "rotor", "field_frame", "armature", "full_motor"]);

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

async function loadWorkOrderForTech(woId, shopEmail) {
  if (!mongoose.isValidObjectId(woId)) return null;
  await connectDB();
  return WorkOrder.findOne({ _id: woId, createdByEmail: shopEmail }).lean();
}

function inspectionQueryForWorkOrder(wo, email) {
  const id = wo._id.toString();
  const or = [{ workOrderId: id, createdByEmail: email }];
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
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const woId = params?.id;
    if (!woId) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const email = tech.shopEmail.trim().toLowerCase();
    const wo = await loadWorkOrderForTech(woId, email);
    if (!wo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isWorkOrderOpenStatus(wo.status)) {
      return NextResponse.json(
        { error: "This work order is closed and is not available in the mobile app." },
        { status: 404 }
      );
    }

    const list = await MotorRepairInspection.find(inspectionQueryForWorkOrder(wo, email))
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(list.map((r) => toPublicInspection(r)));
  } catch (err) {
    console.error("Tech work-order inspections GET:", err);
    return NextResponse.json({ error: "Failed to load inspections" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const woId = params?.id;
    if (!woId) return NextResponse.json({ error: "ID required" }, { status: 400 });

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

    const email = tech.shopEmail.trim().toLowerCase();
    const wo = await loadWorkOrderForTech(woId, email);
    if (!wo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isWorkOrderOpenStatus(wo.status)) {
      return NextResponse.json(
        { error: "This work order is closed and is not available in the mobile app." },
        { status: 404 }
      );
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

    return NextResponse.json({ ok: true, inspection: toPublicInspection(doc) });
  } catch (err) {
    console.error("Tech work-order inspections POST:", err);
    return NextResponse.json({ error: err.message || "Failed to save inspection" }, { status: 500 });
  }
}
