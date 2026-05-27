import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import { loadWriteUpQuoteForTechnician } from "@/lib/tech-job-queries";
import {
  inspectionComponentForSave,
  normalizeInspectionFindings,
  normalizeInspectionKind,
  toPublicInspection,
} from "@/lib/motor-inspection-api";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const quoteId = decodeURIComponent(String(params?.quoteId || "").trim());
    if (!quoteId) {
      return NextResponse.json({ error: "Quote id required" }, { status: 400 });
    }

    await connectDB();
    const ctx = await loadWriteUpQuoteForTechnician(tech, quoteId);
    if (!ctx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const email = tech.shopEmail.trim().toLowerCase();
    const list = await MotorRepairInspection.find({ quoteId, createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(list.map((r) => toPublicInspection(r)));
  } catch (err) {
    console.error("Tech pre-inspection inspections GET:", err);
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
    const quoteId = decodeURIComponent(String(params?.quoteId || "").trim());
    if (!quoteId) {
      return NextResponse.json({ error: "Quote id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const kind = normalizeInspectionKind(body.kind);
    if (kind !== "preliminary") {
      return NextResponse.json({ error: "kind must be preliminary" }, { status: 400 });
    }

    await connectDB();
    const ctx = await loadWriteUpQuoteForTechnician(tech, quoteId);
    if (!ctx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const email = tech.shopEmail.trim().toLowerCase();
    const findings = normalizeInspectionFindings(body);
    const doc = await MotorRepairInspection.create({
      quoteId,
      createdByEmail: email,
      kind,
      component: inspectionComponentForSave(),
      findings,
    });

    return NextResponse.json({ ok: true, inspection: toPublicInspection(doc) });
  } catch (err) {
    console.error("Tech pre-inspection inspections POST:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
