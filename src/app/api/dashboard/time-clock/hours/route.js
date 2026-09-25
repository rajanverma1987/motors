import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import TimeClockPunch from "@/models/TimeClockPunch";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  computeHoursFromPunches,
  hoursOnLocalDay,
  lateEarlyFlags,
  localDateIso,
  mergeHoursWithManual,
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

    const workDate = {};
    if (from) workDate.$gte = from;
    if (to) workDate.$lte = to;

    const punchQ = {
      createdByEmail: email,
      voidedAt: null,
      ...(Object.keys(punchedAt).length ? { punchedAt } : {}),
      ...(employeeId ? { employeeId } : {}),
    };
    const manualQ = {
      createdByEmail: email,
      voidedAt: null,
      ...(Object.keys(workDate).length ? { workDate } : {}),
      ...(employeeId ? { employeeId } : {}),
    };

    const now = new Date();
    const today = localDateIso(now);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const lookback = new Date(todayStart);
    lookback.setDate(lookback.getDate() - 7);

    const [punches, manuals, todayPunches] = await Promise.all([
      TimeClockPunch.find(punchQ).sort({ punchedAt: 1 }).lean(),
      TimeClockManualHours.find(manualQ).sort({ workDate: 1 }).lean(),
      TimeClockPunch.find({
        createdByEmail: email,
        voidedAt: null,
        punchedAt: { $gte: lookback, $lte: now },
        ...(employeeId ? { employeeId } : {}),
      })
        .sort({ punchedAt: 1 })
        .lean(),
    ]);

    const byEmployeePunches = new Map();
    for (const p of punches) {
      const id = String(p.employeeId);
      if (!byEmployeePunches.has(id)) byEmployeePunches.set(id, []);
      byEmployeePunches.get(id).push(p);
    }

    const byEmployeeManual = new Map();
    for (const m of manuals) {
      const id = String(m.employeeId);
      if (!byEmployeeManual.has(id)) byEmployeeManual.set(id, []);
      byEmployeeManual.get(id).push(m);
    }

    const byEmployeeToday = new Map();
    for (const p of todayPunches) {
      const id = String(p.employeeId);
      if (!byEmployeeToday.has(id)) byEmployeeToday.set(id, []);
      byEmployeeToday.get(id).push(p);
    }

    const empIds = [
      ...new Set([
        ...byEmployeePunches.keys(),
        ...byEmployeeManual.keys(),
        ...byEmployeeToday.keys(),
      ]),
    ];
    const employees = empIds.length
      ? await Employee.find({
          createdByEmail: email,
          _id: { $in: empIds },
        })
          .select("name employeeNumber department scheduledStart scheduledEnd hourlyRate payType")
          .lean()
      : [];
    const empMap = new Map(employees.map((e) => [String(e._id), e]));

    const rows = [];
    for (const id of empIds) {
      const list = byEmployeePunches.get(id) || [];
      const manualList = byEmployeeManual.get(id) || [];
      const emp = empMap.get(id);
      const punchHours = computeHoursFromPunches(list);
      const hours = mergeHoursWithManual(punchHours, manualList);
      const todayHours = hoursOnLocalDay(byEmployeeToday.get(id) || [], today, now);
      if (!list.length && !manualList.length && todayHours <= 0) continue;
      const flags = list.map((p) =>
        lateEarlyFlags(p.punchedAt, emp?.scheduledStart, emp?.scheduledEnd, p.type)
      );
      rows.push({
        employeeId: id,
        name: emp?.name || list[0]?.employeeName || manualList[0]?.employeeName || "",
        employeeNumber: emp?.employeeNumber || "",
        department: emp?.department || "",
        payType: emp?.payType || "hourly",
        hourlyRate: emp?.hourlyRate || "",
        clockedHours: hours.clockedHours,
        manualHours: hours.manualHours,
        totalHours: hours.totalHours,
        todayHours,
        byDay: hours.byDay,
        lateCount: flags.filter((f) => f.late).length,
        earlyCount: flags.filter((f) => f.early).length,
        punchCount: list.length,
        manualEntryCount: manualList.length,
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
