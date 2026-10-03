import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TimeClockPunch from "@/models/TimeClockPunch";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  buildDailyPunchSummaries,
  eachLocalDate,
  localDateIso,
  punchSessionMetrics,
  punchWorkDate,
  serializePunch,
  summarizePunchSessions,
  workedHoursAfter,
} from "@/lib/time-clock-punches";
import { settledInactiveEmployeeIds } from "@/lib/payroll-hour-balance";
import EmployeePayrollPayment from "@/models/EmployeePayrollPayment";
import TimeClockManualHours from "@/models/TimeClockManualHours";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const view = String(searchParams.get("view") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));
    const employeeId = String(searchParams.get("employeeId") || "").trim();
    const includeVoided = searchParams.get("includeVoided") === "1";

    if (view === "calendar") {
      const from = String(searchParams.get("from") || "").slice(0, 10);
      const to = String(searchParams.get("to") || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
        return NextResponse.json({ error: "A valid from and to date are required." }, { status: 400 });
      }
      const days = eachLocalDate(from, to, 63);
      if (days.length === 0 || days.length > 62 || days[days.length - 1] !== to) {
        return NextResponse.json({ error: "Select 62 days or fewer." }, { status: 400 });
      }

      const rangeStart = new Date(`${from}T12:00:00`);
      rangeStart.setDate(rangeStart.getDate() - 1);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(`${to}T12:00:00`);
      rangeEnd.setDate(rangeEnd.getDate() + 2);
      rangeEnd.setHours(23, 59, 59, 999);
      const now = new Date();
      const daySet = new Set(days);
      const [fy, fm, fd] = from.split("-").map(Number);
      const beforeRangeEnd = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
      beforeRangeEnd.setMilliseconds(-1);

      const [employees, punches, manualsInRange, manualsBefore, payments] = await Promise.all([
        Employee.find({ createdByEmail: email })
          .select("name employeeNumber department employmentStatus timeClockEnabled payType hourlyRate")
          .sort({ name: 1 })
          .lean(),
        TimeClockPunch.find({
          createdByEmail: email,
          voidedAt: null,
          punchedAt: { $gte: rangeStart, $lte: rangeEnd },
        })
          .sort({ punchedAt: 1 })
          .lean(),
        TimeClockManualHours.find({
          createdByEmail: email,
          voidedAt: null,
          workDate: { $gte: from, $lte: to },
        }).lean(),
        TimeClockManualHours.find({
          createdByEmail: email,
          voidedAt: null,
          workDate: { $lt: from },
        }).lean(),
        EmployeePayrollPayment.find({
          createdByEmail: email,
          payType: "hourly",
        }).lean(),
      ]);

      const punchesBefore = await TimeClockPunch.find({
        createdByEmail: email,
        voidedAt: null,
        punchedAt: { $lte: beforeRangeEnd },
      })
        .sort({ punchedAt: 1 })
        .lean();

      const byEmployee = new Map();
      for (const punch of punches) {
        const id = String(punch.employeeId || "");
        if (!id) continue;
        if (!byEmployee.has(id)) byEmployee.set(id, []);
        byEmployee.get(id).push(punch);
      }

      const manualsByEmployee = new Map();
      for (const manual of manualsInRange) {
        const id = String(manual.employeeId || "");
        const workDate = String(manual.workDate || "").slice(0, 10);
        if (!id || !daySet.has(workDate)) continue;
        if (!manualsByEmployee.has(id)) manualsByEmployee.set(id, []);
        manualsByEmployee.get(id).push(manual);
      }

      const punchesBeforeByEmployee = new Map();
      for (const punch of punchesBefore) {
        const id = String(punch.employeeId || "");
        if (!id) continue;
        if (!punchesBeforeByEmployee.has(id)) punchesBeforeByEmployee.set(id, []);
        punchesBeforeByEmployee.get(id).push(punch);
      }
      const manualsBeforeByEmployee = new Map();
      for (const manual of manualsBefore) {
        const id = String(manual.employeeId || "");
        if (!id) continue;
        if (!manualsBeforeByEmployee.has(id)) manualsBeforeByEmployee.set(id, []);
        manualsBeforeByEmployee.get(id).push(manual);
      }

      const paidByEmployee = new Map();
      for (const payment of payments) {
        const id = String(payment.employeeId || "").trim();
        if (!id) continue;
        const hours = Number(payment.hours) || 0;
        if (hours > 0) {
          paidByEmployee.set(
            id,
            Math.round(((paidByEmployee.get(id) || 0) + hours + Number.EPSILON) * 100) / 100
          );
        }
      }

      const hiddenIds = await settledInactiveEmployeeIds(email);
      const rows = employees
        .filter((employee) => {
          const id = String(employee._id);
          if (hiddenIds.has(id)) return false;
          const status = String(employee.employmentStatus || "Active");
          const hasActivity = byEmployee.has(id) || manualsByEmployee.has(id);
          if (status === "Terminated" && !hasActivity) return false;
          return employee.timeClockEnabled !== false || hasActivity;
        })
        .map((employee) => {
          const id = String(employee._id);
          const sessions = summarizePunchSessions(byEmployee.get(id) || []).filter((session) =>
            daySet.has(session.date)
          );
          const byDay = {};
          const ensureDay = (date) => {
            if (!byDay[date]) {
              byDay[date] = { sessions: [], manualHours: 0, manualJobNumbers: [] };
            }
            return byDay[date];
          };
          for (const session of sessions) {
            const metrics = punchSessionMetrics(session, now);
            if (!metrics) continue;
            ensureDay(session.date).sessions.push(metrics);
          }
          for (const manual of manualsByEmployee.get(id) || []) {
            const workDate = String(manual.workDate || "").slice(0, 10);
            const hours = Number(manual.hours) || 0;
            if (!workDate || hours <= 0) continue;
            const day = ensureDay(workDate);
            day.manualHours =
              Math.round((day.manualHours + hours + Number.EPSILON) * 100) / 100;
            const jobNo = String(manual.documentNumber || "").trim();
            if (jobNo && !day.manualJobNumbers.includes(jobNo)) {
              day.manualJobNumbers.push(jobNo);
            }
          }
          const workedBefore = workedHoursAfter(
            punchesBeforeByEmployee.get(id) || [],
            manualsBeforeByEmployee.get(id) || [],
            new Date(0),
            beforeRangeEnd
          );
          return {
            employeeId: id,
            employeeName: employee.name || "",
            employeeNumber: employee.employeeNumber || "",
            department: employee.department || "",
            payType:
              String(employee.payType || "").toLowerCase() === "salary" ? "salary" : "hourly",
            hourlyRate: String(employee.hourlyRate || "").trim(),
            lifetimePaidHours: paidByEmployee.get(id) || 0,
            workedHoursBefore: workedBefore,
            days: byDay,
          };
        })
        .filter((row) => Object.keys(row.days).length > 0);

      return NextResponse.json({ view: "calendar", from, to, days, employees: rows });
    }

    if (view === "summary") {
      const today = localDateIso();
      // Wide window so local calendar "today" is covered across server/client TZ.
      const center = new Date(`${today}T12:00:00`);
      const dayStart = new Date(center.getTime() - 20 * 60 * 60 * 1000);
      const dayEnd = new Date(center.getTime() + 20 * 60 * 60 * 1000);

      const [employees, recentPunches] = await Promise.all([
        Employee.find({ createdByEmail: email })
          .select("name employeeNumber department employmentStatus timeClockEnabled")
          .sort({ name: 1 })
          .lean(),
        TimeClockPunch.find({
          createdByEmail: email,
          voidedAt: null,
          punchedAt: { $gte: dayStart, $lte: dayEnd },
        })
          .sort({ punchedAt: 1 })
          .lean(),
      ]);

      const byEmployee = new Map();
      for (const p of recentPunches) {
        if (punchWorkDate(p.punchedAt) !== today) continue;
        const id = String(p.employeeId);
        if (!byEmployee.has(id)) byEmployee.set(id, []);
        byEmployee.get(id).push(p);
      }

      const hiddenIds = await settledInactiveEmployeeIds(email);
      const rows = employees
        .filter((e) => {
          const id = String(e._id);
          if (hiddenIds.has(id)) return false;
          const status = String(e.employmentStatus || "Active");
          if (status === "Terminated" && !byEmployee.has(id)) return false;
          return e.timeClockEnabled !== false || byEmployee.has(id);
        })
        .map((e) => {
          const id = String(e._id);
          const dayRows = buildDailyPunchSummaries(byEmployee.get(id) || []);
          const todayRow = dayRows.find((d) => d.date === today) || dayRows[0] || null;
          return {
            employeeId: id,
            employeeName: e.name || "",
            employeeNumber: e.employeeNumber || "",
            department: e.department || "",
            employmentStatus: e.employmentStatus || "Active",
            todayIn: todayRow?.inAt || null,
            todayOut: todayRow?.outAt || null,
            todayDate: today,
          };
        });

      const totalCount = rows.length;
      const slice = rows.slice((page - 1) * pageSize, page * pageSize);
      return NextResponse.json({
        view: "summary",
        today,
        items: slice,
        page,
        pageSize,
        totalCount,
      });
    }

    if (view === "by-day") {
      if (!employeeId) {
        return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
      }
      const emp = await Employee.findOne({ _id: employeeId, createdByEmail: email }).lean();
      if (!emp) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      const list = await TimeClockPunch.find({
        createdByEmail: email,
        employeeId,
        voidedAt: null,
      })
        .sort({ punchedAt: 1 })
        .lean();
      const days = buildDailyPunchSummaries(list);
      return NextResponse.json({
        view: "by-day",
        employee: {
          id: String(emp._id),
          name: emp.name || "",
          employeeNumber: emp.employeeNumber || "",
        },
        days,
      });
    }

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

    if (body.voidDay === true) {
      if (!user.isOwner) {
        return NextResponse.json(
          { error: "Only the shop admin can delete punches." },
          { status: 403 }
        );
      }
      const employeeId = String(body.employeeId || "").trim();
      const workDate = String(body.workDate || body.date || "").trim().slice(0, 10);
      if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
        return NextResponse.json({ error: "employeeId and workDate (YYYY-MM-DD) required" }, { status: 400 });
      }
      const list = await TimeClockPunch.find({
        createdByEmail: email,
        employeeId,
        voidedAt: null,
      }).lean();
      const ids = summarizePunchSessions(list)
        .filter((session) => session.date === workDate)
        .flatMap((session) => session.punchIds || []);
      if (!ids.length) {
        return NextResponse.json({ error: "No punches found for that date." }, { status: 404 });
      }
      const now = new Date();
      const reason = String(body.voidReason || "Day voided by manager").trim().slice(0, 500);
      await TimeClockPunch.updateMany(
        { _id: { $in: ids }, createdByEmail: email },
        {
          $set: {
            voidedAt: now,
            voidReason: reason,
            source: "manager_edit",
          },
        }
      );
      return NextResponse.json({ ok: true, voidedCount: ids.length, workDate });
    }

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
