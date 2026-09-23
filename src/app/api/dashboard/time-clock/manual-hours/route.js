import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  parseManualHoursInput,
  serializeManualHours,
} from "@/lib/time-clock-punches";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const from = String(searchParams.get("from") || "").slice(0, 10);
    const to = String(searchParams.get("to") || "").slice(0, 10);
    const employeeId = String(searchParams.get("employeeId") || "").trim();
    const includeVoided = searchParams.get("includeVoided") === "1";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

    const workDate = {};
    if (from) workDate.$gte = from;
    if (to) workDate.$lte = to;

    const q = {
      createdByEmail: email,
      ...(employeeId ? { employeeId } : {}),
      ...(includeVoided ? {} : { voidedAt: null }),
      ...(Object.keys(workDate).length ? { workDate } : {}),
    };

    const [totalCount, list] = await Promise.all([
      TimeClockManualHours.countDocuments(q),
      TimeClockManualHours.find(q)
        .sort({ workDate: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    return NextResponse.json({
      items: list.map(serializeManualHours),
      page,
      pageSize,
      totalCount,
      from: from || null,
      to: to || null,
    });
  } catch (err) {
    console.error("Dashboard manual hours GET error:", err);
    return NextResponse.json({ error: "Failed to list manual hours" }, { status: 500 });
  }
}

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "time-clock-manual-hours", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const employeeId = String(body.employeeId || "").trim();
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const parsed = parseManualHoursInput({
      workDate: body.workDate || body.date,
      hours: body.hours,
    });
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const emp = await Employee.findOne({ _id: employeeId, createdByEmail: email }).lean();
    if (!emp) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const doc = await TimeClockManualHours.create({
      createdByEmail: email,
      employeeId,
      employeeName: emp.name || "",
      employeeNumber: emp.employeeNumber || "",
      workDate: parsed.workDate,
      hours: parsed.hours,
      note: String(body.note || "").trim().slice(0, 500),
      createdByUserEmail: email,
    });

    return NextResponse.json({ ok: true, entry: serializeManualHours(doc) }, { status: 201 });
  } catch (err) {
    console.error("Dashboard manual hours POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save manual hours" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { allowed } = await checkRateLimit(request, "time-clock-manual-hours-patch", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const doc = await TimeClockManualHours.findOne({ _id: id, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.void === true) {
      doc.voidedAt = new Date();
      doc.voidReason = String(body.voidReason || "Voided by manager").trim().slice(0, 500);
      await doc.save();
      return NextResponse.json({ ok: true, entry: serializeManualHours(doc) });
    }

    if (doc.voidedAt) {
      return NextResponse.json({ error: "Cannot edit a voided entry." }, { status: 400 });
    }

    if (body.workDate != null || body.hours != null) {
      const parsed = parseManualHoursInput({
        workDate: body.workDate != null ? body.workDate : doc.workDate,
        hours: body.hours != null ? body.hours : doc.hours,
      });
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      doc.workDate = parsed.workDate;
      doc.hours = parsed.hours;
    }
    if (body.note !== undefined) {
      doc.note = String(body.note || "").trim().slice(0, 500);
    }

    await doc.save();
    return NextResponse.json({ ok: true, entry: serializeManualHours(doc) });
  } catch (err) {
    console.error("Dashboard manual hours PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update manual hours" }, { status: 500 });
  }
}
