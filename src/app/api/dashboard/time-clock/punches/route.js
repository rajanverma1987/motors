import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TimeClockPunch from "@/models/TimeClockPunch";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { serializePunch } from "@/lib/time-clock-punches";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));
    const employeeId = String(searchParams.get("employeeId") || "").trim();
    const includeVoided = searchParams.get("includeVoided") === "1";
    const q = {
      createdByEmail: email,
      ...(employeeId ? { employeeId } : {}),
      ...(includeVoided ? {} : { voidedAt: null }),
    };
    const [totalCount, list] = await Promise.all([
      TimeClockPunch.countDocuments(q),
      TimeClockPunch.find(q)
        .sort({ punchedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);
    return NextResponse.json({
      items: list.map(serializePunch),
      page,
      pageSize,
      totalCount,
    });
  } catch (err) {
    console.error("Dashboard punches GET error:", err);
    return NextResponse.json({ error: "Failed to list punches" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const employeeId = String(body.employeeId || "").trim();
    const type = String(body.type || "").trim();
    if (!employeeId || !["in", "out", "break_start", "break_end"].includes(type)) {
      return NextResponse.json({ error: "employeeId and valid type required" }, { status: 400 });
    }
    const emp = await Employee.findOne({ _id: employeeId, createdByEmail: email }).lean();
    if (!emp) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const punchedAt = body.punchedAt ? new Date(body.punchedAt) : new Date();
    if (Number.isNaN(punchedAt.getTime())) {
      return NextResponse.json({ error: "Invalid punchedAt" }, { status: 400 });
    }
    const doc = await TimeClockPunch.create({
      createdByEmail: email,
      employeeId,
      employeeName: emp.name || "",
      employeeNumber: emp.employeeNumber || "",
      type,
      punchedAt,
      source: "manager_edit",
      note: String(body.note || "").trim().slice(0, 500),
    });
    return NextResponse.json({ ok: true, punch: serializePunch(doc) }, { status: 201 });
  } catch (err) {
    console.error("Dashboard punches POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create punch" }, { status: 500 });
  }
}

export async function PATCH(request) {
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
    const doc = await TimeClockPunch.findOne({ _id: id, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (body.void === true) {
      doc.voidedAt = new Date();
      doc.voidReason = String(body.voidReason || "Voided by manager").trim().slice(0, 500);
    }
    if (body.punchedAt) {
      const d = new Date(body.punchedAt);
      if (!Number.isNaN(d.getTime())) doc.punchedAt = d;
    }
    if (body.type && ["in", "out", "break_start", "break_end"].includes(body.type)) {
      doc.type = body.type;
    }
    if (body.note !== undefined) doc.note = String(body.note || "").trim().slice(0, 500);
    doc.source = "manager_edit";
    await doc.save();
    return NextResponse.json({ ok: true, punch: serializePunch(doc) });
  } catch (err) {
    console.error("Dashboard punches PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update punch" }, { status: 500 });
  }
}
