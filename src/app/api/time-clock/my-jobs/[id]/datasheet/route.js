import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { datasheetStorageKey, resolveMachineType } from "@/lib/machine-types";
import { notifySimpleJobBoardFromSp } from "@/lib/job-board-emit";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  findAssignedJob,
  loadShopMergedSettings,
  normalizeDatasheetForMachine,
  requireTechnicianSession,
  serializeMyJobDetail,
} from "@/lib/time-clock-my-jobs";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function PUT(request, context) {
  const { allowed } = await checkRateLimit(request, "time-clock-my-jobs-datasheet", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const auth = await requireTechnicianSession(request, token);
    if (auth.error) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }
    const { session, shop } = auth;
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    const previous = await findAssignedJob(shop.ownerEmail, session.employeeId, id);
    if (!previous) {
      return NextResponse.json({ error: "Job not found or not assigned to you." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const machineType = resolveMachineType(previous.motorPower, "AC");
    const key = datasheetStorageKey(machineType);
    const documentNumber = String(previous.documentNumber || previous.quote || "").trim();
    const datasheet = normalizeDatasheetForMachine(machineType, body?.datasheet || body, documentNumber);
    // Keep assignment on this technician unless they explicitly change (still must stay assignable)
    if (!String(datasheet.technician || "").trim()) {
      datasheet.technician = session.employeeId;
    }

    const doc = await SimpleServiceProposal.findOneAndUpdate(
      { _id: id, createdByEmail: shop.ownerEmail },
      { $set: { [key]: datasheet } },
      { new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Failed to save datasheet" }, { status: 500 });
    }

    void notifySimpleJobBoardFromSp(shop.ownerEmail, previous, doc);
    const mergedSettings = await loadShopMergedSettings(shop.ownerEmail);
    return NextResponse.json({ ok: true, job: serializeMyJobDetail(doc, mergedSettings) });
  } catch (err) {
    console.error("Time clock my-jobs datasheet PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to save datasheet" }, { status: 500 });
  }
}
