import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidSimplePortalId } from "@/lib/simple-portal-mongo";
import { parseManualHoursInput, serializeManualHours } from "@/lib/time-clock-punches";
import { mergeUserSettings } from "@/lib/user-settings";
import { workOrderStatusSelectOptionsFromMerged } from "@/lib/dropdown-catalog";

async function hoursJobStatusForShop(email, raw) {
  const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
  const options = workOrderStatusSelectOptionsFromMerged(mergeUserSettings(settingsDoc?.settings));
  const value = String(raw || "").trim();
  const hit = options.find((option) => option.value === value);
  return hit ? hit.value : "";
}

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const proposal = await SimpleServiceProposal.findOne({ _id: id, createdByEmail: email })
      .select({ _id: 1 })
      .lean();
    if (!proposal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const list = await TimeClockManualHours.find({
      createdByEmail: email,
      proposalId: id,
      voidedAt: null,
    })
      .sort({ workDate: -1, createdAt: -1 })
      .limit(200)
      .lean();
    const items = list.map(serializeManualHours);
    const totalHours =
      Math.round(items.reduce((sum, row) => sum + (Number(row.hours) || 0), 0) * 100) / 100;
    return NextResponse.json({ ok: true, totalHours, items });
  } catch (err) {
    console.error("Proposal job hours GET error:", err);
    return NextResponse.json({ error: "Failed to load recorded hours" }, { status: 500 });
  }
}

async function ownedJobHoursEntry(email, proposalId, entryId) {
  if (!isValidSimplePortalId(entryId)) return { error: "Invalid id", status: 400 };
  const proposal = await SimpleServiceProposal.findOne({ _id: proposalId, createdByEmail: email })
    .select({ _id: 1 })
    .lean();
  if (!proposal) return { error: "Not found", status: 404 };
  const doc = await TimeClockManualHours.findOne({
    _id: entryId,
    createdByEmail: email,
    proposalId,
    voidedAt: null,
  });
  if (!doc) return { error: "Not found", status: 404 };
  return { doc };
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const proposalId = String(params?.id || "").trim();
    if (!isValidSimplePortalId(proposalId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const employeeId = String(body.employeeId || "").trim();
    if (!employeeId) {
      return NextResponse.json({ error: "Technician is required" }, { status: 400 });
    }
    const parsed = parseManualHoursInput({
      workDate: body.workDate || body.date,
      hours: body.hours,
    });
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const proposal = await SimpleServiceProposal.findOne({ _id: proposalId, createdByEmail: email })
      .select({ documentNumber: 1, quote: 1 })
      .lean();
    if (!proposal) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const jobStatus = await hoursJobStatusForShop(email, body.jobStatus);
    if (!jobStatus) {
      return NextResponse.json({ error: "Job status is required." }, { status: 400 });
    }
    const employee = await Employee.findOne({ _id: employeeId, createdByEmail: email })
      .select({ name: 1, employeeNumber: 1, email: 1 })
      .lean();
    if (!employee) {
      return NextResponse.json({ error: "Technician not found" }, { status: 404 });
    }
    const doc = await TimeClockManualHours.create({
      createdByEmail: email,
      employeeId,
      employeeName: employee.name || "",
      employeeNumber: employee.employeeNumber || "",
      workDate: parsed.workDate,
      hours: parsed.hours,
      note: String(body.note || "").trim().slice(0, 500),
      proposalId,
      documentNumber: String(proposal.documentNumber || proposal.quote || "").trim(),
      jobStatus,
      createdByUserEmail: email,
    });
    return NextResponse.json({ ok: true, entry: serializeManualHours(doc) }, { status: 201 });
  } catch (err) {
    console.error("Proposal job hours POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save hours" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const proposalId = String(params?.id || "").trim();
    if (!isValidSimplePortalId(proposalId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const owned = await ownedJobHoursEntry(email, proposalId, String(body.id || "").trim());
    if (owned.error) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }
    const parsed = parseManualHoursInput({
      workDate: body.workDate,
      hours: body.hours,
    });
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const jobStatus = await hoursJobStatusForShop(email, body.jobStatus);
    if (!jobStatus) {
      return NextResponse.json({ error: "Job status is required." }, { status: 400 });
    }
    owned.doc.workDate = parsed.workDate;
    owned.doc.hours = parsed.hours;
    owned.doc.jobStatus = jobStatus;
    await owned.doc.save();
    return NextResponse.json({ ok: true, entry: serializeManualHours(owned.doc) });
  } catch (err) {
    console.error("Proposal job hours PATCH error:", err);
    return NextResponse.json({ error: "Failed to update recorded hours" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const proposalId = String(params?.id || "").trim();
    if (!isValidSimplePortalId(proposalId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const entryId = String(new URL(request.url).searchParams.get("entryId") || "").trim();
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const owned = await ownedJobHoursEntry(email, proposalId, entryId);
    if (owned.error) {
      return NextResponse.json({ error: owned.error }, { status: owned.status });
    }
    owned.doc.voidedAt = new Date();
    owned.doc.voidReason = "Deleted from proposal";
    await owned.doc.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Proposal job hours DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete recorded hours" }, { status: 500 });
  }
}
