import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import Quote from "@/models/Quote";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import { isWriteUpStatus } from "@/lib/quote-rfq-lifecycle";
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

async function loadQuote(id, email) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return Quote.findOne({ _id: id, createdByEmail: email }).lean();
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    const email = user.email.trim().toLowerCase();
    const quote = await loadQuote(id, email);
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const list = await MotorRepairInspection.find({ quoteId: id, createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(list.map((r) => toPublicInspection(r)));
  } catch (err) {
    console.error("quote inspections GET:", err);
    return NextResponse.json({ error: "Failed to load inspections" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    const body = await request.json().catch(() => ({}));
    const kind = normalizeInspectionKind(body.kind);
    if (!kind) {
      return NextResponse.json({ error: "kind must be preliminary or detailed" }, { status: 400 });
    }
    if (kind !== "preliminary") {
      return NextResponse.json(
        { error: "Only pre-inspection can be recorded on an RFQ before a work order exists" },
        { status: 400 }
      );
    }

    const email = user.email.trim().toLowerCase();
    const quote = await loadQuote(id, email);
    if (!quote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!isWriteUpStatus(quote.status)) {
      return NextResponse.json(
        { error: "Pre-inspection can only be added while RFQ status is Write-Up" },
        { status: 400 }
      );
    }

    const findings = normalizeInspectionFindings(body);
    const doc = await MotorRepairInspection.create({
      quoteId: id,
      createdByEmail: email,
      kind,
      component: inspectionComponentForSave(),
      findings,
    });

    return NextResponse.json({ ok: true, inspection: toPublicInspection(doc) });
  } catch (err) {
    console.error("quote inspections POST:", err);
    return NextResponse.json({ error: err.message || "Failed to save inspection" }, { status: 500 });
  }
}
