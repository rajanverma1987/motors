import ExcelJS from "exceljs";
import Employee from "@/models/Employee";
import TimeClockPunch from "@/models/TimeClockPunch";
import TimeClockManualHours from "@/models/TimeClockManualHours";
import User from "@/models/User";
import UserSettings from "@/models/UserSettings";
import { sendPayrollHoursWorkbookEmail } from "@/lib/email";
import { mergeUserSettings } from "@/lib/user-settings";
import { shopWeekContaining } from "@/lib/shop-week";
import {
  getOpenPunchState,
  localDateIso,
  punchSessionMetrics,
  serializePunch,
  summarizePunchSessions,
} from "@/lib/time-clock-punches";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function firstString(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

export function normalizePayrollCommunication(raw = {}) {
  const enabled = Boolean(
    raw.enabled != null ? raw.enabled : raw.payrollCommunicationEnabled
  );
  const email = firstString(raw.email, raw.payrollCommunicationEmail)
    .toLowerCase()
    .slice(0, 254);
  const freq = firstString(
    raw.frequency,
    raw.payrollCommunicationFrequency,
    "daily"
  ).toLowerCase();
  const frequency = freq === "weekly" ? "weekly" : "daily";
  return {
    enabled,
    email,
    frequency,
    lastSentKey: firstString(raw.lastSentKey, raw.payrollCommunicationLastSentKey),
    lastSentAt: firstString(raw.lastSentAt, raw.payrollCommunicationLastSentAt),
  };
}

export function payrollCommunicationFromSettings(settings = {}) {
  return normalizePayrollCommunication({
    enabled: settings.payrollCommunicationEnabled,
    email: settings.payrollCommunicationEmail,
    frequency: settings.payrollCommunicationFrequency,
    lastSentKey: settings.payrollCommunicationLastSentKey,
    lastSentAt: settings.payrollCommunicationLastSentAt,
  });
}

function formatClock(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatBreaks(breaks) {
  return (Array.isArray(breaks) ? breaks : [])
    .map((item) => {
      const start = formatClock(item.start);
      const end = formatClock(item.end);
      if (!start) return "";
      return end ? `${start} to ${end}` : `${start}, open`;
    })
    .filter(Boolean)
    .join("; ");
}

function addSheet(workbook, name, headers, rows) {
  const sheet = workbook.addWorksheet(String(name).replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || "Sheet");
  const cols = headers.map((h) => String(h ?? ""));
  sheet.addRow(cols);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row.map((cell) => (cell == null ? "" : cell)));
  }
  sheet.columns = cols.map((h, idx) => {
    let max = String(h || "").length;
    for (const row of rows) {
      max = Math.max(max, String(row?.[idx] ?? "").length);
    }
    return { width: Math.min(40, Math.max(12, max + 2)) };
  });
  if (cols.length && rows.length) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: cols.length },
    };
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function shopHasAnyoneClockedIn(ownerEmail) {
  const employees = await Employee.find({
    createdByEmail: ownerEmail,
    employmentStatus: "Active",
    timeClockEnabled: { $ne: false },
  })
    .select("_id")
    .lean();
  for (const emp of employees) {
    const state = await getOpenPunchState(ownerEmail, String(emp._id));
    if (state.clockedIn) return true;
  }
  return false;
}

function periodForFrequency(frequency, now, weekStartDay, weekEndDay) {
  const today = localDateIso(now);
  if (frequency === "weekly") {
    const week = shopWeekContaining(today, weekStartDay, weekEndDay);
    return {
      from: week.from,
      to: week.to,
      key: `weekly:${week.from}:${week.to}`,
      label: `${week.from} to ${week.to}`,
      ready: today === week.to,
    };
  }
  return {
    from: today,
    to: today,
    key: `daily:${today}`,
    label: today,
    ready: true,
  };
}

async function buildPayrollWorkbook({ ownerEmail, from, to }) {
  const fromDay = new Date(`${from}T00:00:00`);
  fromDay.setDate(fromDay.getDate() - 1);
  const toDay = new Date(`${to}T23:59:59.999`);
  toDay.setDate(toDay.getDate() + 1);

  const [punches, manuals] = await Promise.all([
    TimeClockPunch.find({
      createdByEmail: ownerEmail,
      voidedAt: null,
      punchedAt: { $gte: fromDay, $lte: toDay },
    })
      .sort({ punchedAt: 1 })
      .lean(),
    TimeClockManualHours.find({
      createdByEmail: ownerEmail,
      voidedAt: null,
      workDate: { $gte: from, $lte: to },
    })
      .sort({ workDate: 1, employeeName: 1 })
      .lean(),
  ]);

  const byEmployee = new Map();
  for (const punch of punches) {
    const id = String(punch.employeeId || "");
    if (!id) continue;
    if (!byEmployee.has(id)) {
      byEmployee.set(id, {
        employeeId: id,
        employeeName: String(punch.employeeName || "").trim(),
        employeeNumber: String(punch.employeeNumber || "").trim(),
        punches: [],
      });
    }
    byEmployee.get(id).punches.push(punch);
  }

  const now = new Date();
  const hoursRows = [];
  const punchRows = [];

  for (const group of byEmployee.values()) {
    const sessions = summarizePunchSessions(group.punches);
    for (const session of sessions) {
      if (session.date < from || session.date > to) continue;
      const metrics = punchSessionMetrics(session, now);
      const clocked = metrics?.hours == null ? "" : Number(metrics.hours);
      hoursRows.push([
        group.employeeName,
        group.employeeNumber,
        session.date,
        formatClock(session.inAt),
        session.outAt ? formatClock(session.outAt) : session.open ? "Still in" : "",
        formatBreaks(metrics?.breaks || session.breaks),
        clocked,
        "",
        "",
        clocked,
      ]);
    }
    for (const punch of group.punches) {
      const row = serializePunch(punch);
      const day = localDateIso(row.punchedAt);
      if (day < from || day > to) continue;
      punchRows.push([
        group.employeeName,
        group.employeeNumber,
        day,
        row.type,
        row.punchedAt ? new Date(row.punchedAt).toLocaleString() : "",
        row.source,
        row.note,
      ]);
    }
  }

  const manualRows = [];
  for (const manual of manuals) {
    const hours = Math.round((Number(manual.hours) || 0) * 100) / 100;
    const job = String(manual.documentNumber || "").trim();
    const name = String(manual.employeeName || "").trim();
    const number = String(manual.employeeNumber || "").trim();
    const workDate = String(manual.workDate || "").slice(0, 10);
    const note = String(manual.note || "").trim();
    manualRows.push([name, number, workDate, hours, job, note]);
    hoursRows.push([
      name,
      number,
      workDate,
      "",
      "",
      "",
      "",
      hours,
      job,
      hours,
    ]);
  }

  hoursRows.sort((a, b) => {
    const name = String(a[0]).localeCompare(String(b[0]));
    if (name) return name;
    return String(a[2]).localeCompare(String(b[2]));
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IQMotorBase";
  workbook.created = new Date();
  addSheet(
    workbook,
    "Hours",
    [
      "Employee",
      "Number",
      "Date",
      "Punch in",
      "Punch out",
      "Breaks",
      "Clocked hours",
      "Manual hours",
      "Job",
      "Hours",
    ],
    hoursRows
  );
  addSheet(
    workbook,
    "Punches",
    ["Employee", "Number", "Date", "Type", "Time", "Source", "Note"],
    punchRows
  );
  addSheet(
    workbook,
    "Manual hours",
    ["Employee", "Number", "Date", "Hours", "Job", "Note"],
    manualRows
  );
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * After a punch-out, if nobody is still clocked in and the period is complete, email Excel once.
 */
export async function maybeSendPayrollCommunicationAfterPunch({ ownerEmail, punchType }) {
  try {
    if (String(punchType || "") !== "out") return { sent: false, reason: "not-out" };
    const email = String(ownerEmail || "").trim().toLowerCase();
    if (!email) return { sent: false, reason: "no-shop" };

    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const payroll = payrollCommunicationFromSettings(settingsDoc?.settings || {});
    if (!payroll.enabled) return { sent: false, reason: "disabled" };
    if (!EMAIL_RE.test(payroll.email)) return { sent: false, reason: "bad-email" };

    const stillIn = await shopHasAnyoneClockedIn(email);
    if (stillIn) return { sent: false, reason: "still-clocked-in" };

    const merged = mergeUserSettings(settingsDoc?.settings);
    const now = new Date();
    const period = periodForFrequency(
      payroll.frequency,
      now,
      merged.weekStartDay,
      merged.weekEndDay
    );
    if (!period.ready) return { sent: false, reason: "period-not-ended" };
    if (payroll.lastSentKey === period.key) return { sent: false, reason: "already-sent" };

    const claimed = await UserSettings.findOneAndUpdate(
      {
        ownerEmail: email,
        $nor: [{ "settings.payrollCommunicationLastSentKey": period.key }],
      },
      {
        $set: {
          "settings.payrollCommunicationLastSentKey": period.key,
          "settings.payrollCommunicationLastSentAt": now.toISOString(),
        },
      },
      { new: false }
    );
    if (!claimed) return { sent: false, reason: "already-sent" };

    const previousKey = String(claimed.settings?.payrollCommunicationLastSentKey || "");
    const previousAt = String(claimed.settings?.payrollCommunicationLastSentAt || "");

    try {
      const buffer = await buildPayrollWorkbook({ ownerEmail: email, from: period.from, to: period.to });
      const userDoc = await User.findOne({ email }).select("shopName").lean();
      const shopName = String(userDoc?.shopName || "").trim() || "Shop";
      const filename = `payroll-hours-${period.from}${period.from === period.to ? "" : `_to_${period.to}`}.xlsx`;
      const sent = await sendPayrollHoursWorkbookEmail({
        to: payroll.email,
        shopName,
        periodLabel: period.label,
        filename,
        buffer,
      });
      if (!sent?.ok) {
        throw new Error(sent?.error || "Email send failed");
      }
      return { sent: true, period: period.label };
    } catch (err) {
      await UserSettings.updateOne(
        { ownerEmail: email, "settings.payrollCommunicationLastSentKey": period.key },
        {
          $set: {
            "settings.payrollCommunicationLastSentKey": previousKey,
            "settings.payrollCommunicationLastSentAt": previousAt,
          },
        }
      );
      console.error("Payroll communication send failed:", err);
      return { sent: false, reason: "send-failed" };
    }
  } catch (err) {
    console.error("Payroll communication error:", err);
    return { sent: false, reason: "error" };
  }
}
