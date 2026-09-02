import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import TimeClockPunch from "@/models/TimeClockPunch";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  computeHoursFromPunches,
  lateEarlyFlags,
  serializePunch,
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

    const punchedAt = {};
    if (from) punchedAt.$gte = new Date(`${from}T00:00:00.000`);
    if (to) punchedAt.$lte = new Date(`${to}T23:59:59.999`);

    const q = {
      createdByEmail: email,
      voidedAt: null,
      ...(Object.keys(punchedAt).length ? { punchedAt } : {}),
      ...(employeeId ? { employeeId } : {}),
    };

    const punches = await TimeClockPunch.find(q).sort({ punchedAt: 1 }).lean();
    const byEmployee = new Map();
    for (const p of punches) {
      const id = String(p.employeeId);
      if (!byEmployee.has(id)) byEmployee.set(id, []);
      byEmployee.get(id).push(p);
    }

    const empIds = [...byEmployee.keys()];
    const employees = await Employee.find({
      createdByEmail: email,
      _id: { $in: empIds },
    })
      .select("name employeeNumber department scheduledStart scheduledEnd hourlyRate payType")
      .lean();
    const empMap = new Map(employees.map((e) => [String(e._id), e]));

    const rows = [];
    for (const [id, list] of byEmployee) {
      const emp = empMap.get(id);
      const hours = computeHoursFromPunches(list);
      const flags = list.map((p) =>
        lateEarlyFlags(
          p.punchedAt,
          emp?.scheduledStart,
          emp?.scheduledEnd,
          p.type
        )
      );
      rows.push({
        employeeId: id,
        name: emp?.name || list[0]?.employeeName || "",
        employeeNumber: emp?.employeeNumber || "",
        department: emp?.department || "",
        payType: emp?.payType || "hourly",
        hourlyRate: emp?.hourlyRate || "",
        totalHours: hours.totalHours,
        byDay: hours.byDay,
        lateCount: flags.filter((f) => f.late).length,
        earlyCount: flags.filter((f) => f.early).length,
        punchCount: list.length,
      });
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({
      from: from || null,
      to: to || null,
      rows,
      punches: punches.map(serializePunch),
    });
  } catch (err) {
    console.error("Dashboard time clock hours error:", err);
    return NextResponse.json({ error: "Failed to load hours" }, { status: 500 });
  }
}
