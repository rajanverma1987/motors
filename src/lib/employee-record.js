/** Shared employee JSON + field apply for dashboard APIs. */

export function toEmployeeJson(e) {
  if (!e) return null;
  const id = e._id != null ? e._id.toString() : e.id;
  const passkeys = Array.isArray(e.passkeys) ? e.passkeys : [];
  return {
    id,
    name: e.name ?? "",
    email: e.email ?? "",
    role: e.role ?? "",
    phone: e.phone ?? "",
    canLogin: Boolean(e.canLogin),
    technicianAppAccess: Boolean(e.technicianAppAccess),
    timeClockEnabled: e.timeClockEnabled !== false,
    employeeNumber: e.employeeNumber ?? "",
    department: e.department ?? "",
    employmentStatus: e.employmentStatus || "Active",
    hireDate: e.hireDate ?? "",
    payType: e.payType === "salary" ? "salary" : "hourly",
    hourlyRate: e.hourlyRate ?? "",
    scheduledStart: e.scheduledStart ?? "",
    scheduledEnd: e.scheduledEnd ?? "",
    defaultBreakMinutes: Number(e.defaultBreakMinutes) || 0,
    passkeyRegistered: passkeys.length > 0,
    passkeyCount: passkeys.length,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function applyEmployeeBodyFields(doc, body, { clampString, LIMITS }) {
  if (body.name !== undefined) {
    doc.name = clampString(body.name, LIMITS.name.max);
  }
  if (body.email !== undefined) {
    doc.email = body.email?.trim()
      ? String(body.email).trim().toLowerCase().slice(0, LIMITS.email.max)
      : "";
  }
  if (body.role !== undefined) doc.role = clampString(body.role ?? "", LIMITS.shortText.max);
  if (body.phone !== undefined) doc.phone = clampString(body.phone ?? "", 30);
  if (body.canLogin !== undefined) doc.canLogin = Boolean(body.canLogin);
  if (body.technicianAppAccess !== undefined) {
    doc.technicianAppAccess = Boolean(body.technicianAppAccess);
  }
  if (body.timeClockEnabled !== undefined) doc.timeClockEnabled = Boolean(body.timeClockEnabled);
  if (body.employeeNumber !== undefined) {
    doc.employeeNumber = clampString(body.employeeNumber ?? "", 40);
  }
  if (body.department !== undefined) doc.department = clampString(body.department ?? "", 80);
  if (body.employmentStatus !== undefined) {
    const s = String(body.employmentStatus || "").trim();
    doc.employmentStatus = ["Active", "Inactive", "Terminated"].includes(s) ? s : "Active";
  }
  if (body.hireDate !== undefined) {
    doc.hireDate = String(body.hireDate || "").trim().slice(0, 10);
  }
  if (body.payType !== undefined) {
    doc.payType = String(body.payType).trim().toLowerCase() === "salary" ? "salary" : "hourly";
  }
  if (body.hourlyRate !== undefined) {
    doc.hourlyRate = clampString(String(body.hourlyRate ?? ""), 20);
  }
  if (body.scheduledStart !== undefined) {
    doc.scheduledStart = String(body.scheduledStart || "").trim().slice(0, 5);
  }
  if (body.scheduledEnd !== undefined) {
    doc.scheduledEnd = String(body.scheduledEnd || "").trim().slice(0, 5);
  }
  if (body.defaultBreakMinutes !== undefined) {
    const n = Number(body.defaultBreakMinutes);
    doc.defaultBreakMinutes = Number.isFinite(n) ? Math.max(0, Math.min(240, Math.round(n))) : 0;
  }
}
