import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseManualHoursInput, serializeManualHours } from "@/lib/time-clock-punches";
import { findAssignedJob, requireTechnicianSession } from "@/lib/time-clock-my-jobs";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
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
    const job = await findAssignedJob(shop.ownerEmail, session.employeeId, id);
    if (!job) {
      return NextResponse.json({ error: "Job not found or not assigned to you." }, { status: 404 });
    }

    const list = await TimeClockManualHours.find({
      createdByEmail: shop.ownerEmail,
      employeeId: session.employeeId,
      proposalId: id,
      voidedAt: null,
    })
      .sort({ workDate: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ items: list.map(serializeManualHours) });
  } catch (err) {
    console.error("Time clock my-jobs hours GET error:", err);
    return NextResponse.json({ error: "Failed to load hours" }, { status: 500 });
  }
}

export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "time-clock-my-jobs-hours", 60);
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
    const { session, shop, emp } = auth;
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    const job = await findAssignedJob(shop.ownerEmail, session.employeeId, id);
    if (!job) {
      return NextResponse.json({ error: "Job not found or not assigned to you." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = parseManualHoursInput({
      workDate: body.workDate || body.date,
      hours: body.hours,
    });
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const documentNumber = String(job.documentNumber || job.quote || "").trim();
    const doc = await TimeClockManualHours.create({
      createdByEmail: shop.ownerEmail,
      employeeId: session.employeeId,
      employeeName: emp.name || session.employeeName || "",
      employeeNumber: emp.employeeNumber || "",
      workDate: parsed.workDate,
      hours: parsed.hours,
      note: String(body.note || "").trim().slice(0, 500),
      proposalId: id,
      documentNumber,
      createdByUserEmail: String(emp.email || "").trim().toLowerCase() || "",
    });

    return NextResponse.json({ ok: true, entry: serializeManualHours(doc) }, { status: 201 });
  } catch (err) {
    console.error("Time clock my-jobs hours POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save hours" }, { status: 500 });
  }
}
