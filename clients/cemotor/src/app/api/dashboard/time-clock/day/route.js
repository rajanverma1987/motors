import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import Employee from "@/models/Employee";
import TimeClockPunch from "@/models/TimeClockPunch";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import EmployeeDayPaidHours from "@/models/EmployeeDayPaidHours";
import { parseManualHoursInput } from "@/lib/time-clock-punches";

function isId(value) {
  return mongoose.isValidObjectId(String(value || "").trim());
}

function parseInstant(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function collectPunchIds(session) {
  const ids = [
    session?.inPunchId,
    session?.outPunchId,
    ...(Array.isArray(session?.punchIds) ? session.punchIds : []),
    ...(Array.isArray(session?.breaks)
      ? session.breaks.flatMap((item) => [item?.startPunchId, item?.endPunchId])
      : []),
  ];
  return [...new Set(ids.map((id) => String(id || "").trim()).filter((id) => isId(id)))];
}

/**
 * Save one employee calendar day: punch in/out, breaks, manual hours, and hours marked paid.
 */
export async function PUT(request) {
  const { allowed } = await checkRateLimit(request, "time-clock-day-save", 40);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const employeeId = String(body.employeeId || "").trim();
    const workDate = String(body.workDate || "").trim().slice(0, 10);
    if (!isId(employeeId) || !/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      return NextResponse.json({ error: "employeeId and workDate are required." }, { status: 400 });
    }

    const sessions = Array.isArray(body.sessions) ? body.sessions : [];
    const manuals = Array.isArray(body.manualEntries) ? body.manualEntries : [];
    const hasMarked =
      body.markedPaidHours !== undefined && body.markedPaidHours !== null && body.markedPaidHours !== "";
    const markedPaidHours = hasMarked ? Number(body.markedPaidHours) : null;

    for (const session of sessions) {
      if (session?.deleted) continue;
      const inAt = parseInstant(session?.inAt);
      if (!inAt) {
        return NextResponse.json({ error: "Each punch needs a clock-in time." }, { status: 400 });
      }
      const outAt = parseInstant(session?.outAt);
      if (session?.outAt && !outAt) {
        return NextResponse.json({ error: "Clock-out time is invalid." }, { status: 400 });
      }
      if (outAt && outAt.getTime() <= inAt.getTime()) {
        return NextResponse.json({ error: "Clock-out must be after clock-in." }, { status: 400 });
      }
      for (const item of Array.isArray(session?.breaks) ? session.breaks : []) {
        if (item?.deleted) continue;
        const start = parseInstant(item?.start);
        const end = parseInstant(item?.end);
        if ((item?.start && !start) || (item?.end && !end)) {
          return NextResponse.json({ error: "Break time is invalid." }, { status: 400 });
        }
        if (start && end && end.getTime() <= start.getTime()) {
          return NextResponse.json({ error: "Break end must be after break start." }, { status: 400 });
        }
      }
    }
    for (const entry of manuals) {
      if (entry?.deleted) continue;
      const parsed = parseManualHoursInput({ workDate, hours: entry?.hours });
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    if (hasMarked && (!Number.isFinite(markedPaidHours) || markedPaidHours < 0 || markedPaidHours > 48)) {
      return NextResponse.json({ error: "Marked paid hours must be from 0 to 48." }, { status: 400 });
    }

    await connectDB();
    const employee = await Employee.findOne({ _id: employeeId, createdByEmail: owner }).lean();
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const voidReason = "Removed from employee calendar";
    const now = new Date();

    const voidPunches = async (ids) => {
      const unique = [...new Set(ids.filter((id) => isId(id)))];
      if (!unique.length) return;
      await TimeClockPunch.updateMany(
        { _id: { $in: unique }, createdByEmail: owner, employeeId },
        { $set: { voidedAt: now, voidReason, source: "manager_edit" } }
      );
    };

    const setPunchTime = async (id, type, punchedAt) => {
      if (!punchedAt) return "";
      if (isId(id)) {
        const doc = await TimeClockPunch.findOne({ _id: id, createdByEmail: owner, employeeId });
        if (!doc) return "";
        doc.punchedAt = punchedAt;
        doc.type = type;
        doc.voidedAt = null;
        doc.voidReason = "";
        doc.source = "manager_edit";
        await doc.save();
        return String(doc._id);
      }
      const created = await TimeClockPunch.create({
        createdByEmail: owner,
        employeeId,
        employeeName: employee.name || "",
        employeeNumber: employee.employeeNumber || "",
        type,
        punchedAt,
        source: "manager_edit",
      });
      return String(created._id);
    };

    for (const session of sessions) {
      if (session?.deleted) {
        await voidPunches(collectPunchIds(session));
        continue;
      }
      await setPunchTime(session.inPunchId, "in", parseInstant(session.inAt));
      const outAt = parseInstant(session.outAt);
      if (outAt) {
        await setPunchTime(session.outPunchId, "out", outAt);
      } else if (isId(session.outPunchId)) {
        await voidPunches([session.outPunchId]);
      }
      for (const item of Array.isArray(session.breaks) ? session.breaks : []) {
        if (item?.deleted) {
          await voidPunches([item.startPunchId, item.endPunchId]);
          continue;
        }
        const start = parseInstant(item?.start);
        const end = parseInstant(item?.end);
        if (start) await setPunchTime(item.startPunchId, "break_start", start);
        else if (isId(item?.startPunchId)) await voidPunches([item.startPunchId]);
        if (end) await setPunchTime(item.endPunchId, "break_end", end);
        else if (isId(item?.endPunchId)) await voidPunches([item.endPunchId]);
      }
    }

    for (const entry of manuals) {
      const id = String(entry?.id || "").trim();
      if (entry?.deleted) {
        if (!isId(id)) continue;
        const doc = await TimeClockManualHours.findOne({ _id: id, createdByEmail: owner, employeeId });
        if (!doc) continue;
        doc.voidedAt = now;
        doc.voidReason = voidReason;
        await doc.save();
        continue;
      }
      const parsed = parseManualHoursInput({ workDate, hours: entry.hours });
      const note = String(entry?.note || "").trim().slice(0, 500);
      if (isId(id)) {
        const doc = await TimeClockManualHours.findOne({ _id: id, createdByEmail: owner, employeeId });
        if (!doc || doc.voidedAt) continue;
        doc.workDate = parsed.workDate;
        doc.hours = parsed.hours;
        doc.note = note;
        await doc.save();
        continue;
      }
      await TimeClockManualHours.create({
        createdByEmail: owner,
        employeeId,
        employeeName: employee.name || "",
        employeeNumber: employee.employeeNumber || "",
        workDate: parsed.workDate,
        hours: parsed.hours,
        note,
        createdByUserEmail: owner,
      });
    }

    if (hasMarked) {
      const hours = Math.round((markedPaidHours + Number.EPSILON) * 100) / 100;
      if (hours <= 0) {
        await EmployeeDayPaidHours.deleteOne({ createdByEmail: owner, employeeId, workDate });
      } else {
        await EmployeeDayPaidHours.findOneAndUpdate(
          { createdByEmail: owner, employeeId, workDate },
          { $set: { paidHours: hours } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Save employee calendar day error:", err);
    return NextResponse.json({ error: err.message || "Failed to save this day" }, { status: 500 });
  }
}
