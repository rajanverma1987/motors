import ActivityLog from "@/models/ActivityLog";

const PROPOSAL_FIELDS = [
  ["documentNumber", "Job number"],
  ["status", "Status"],
  ["jobStatus", "Job status"],
  ["companyName", "Customer"],
  ["customerPo", "Customer PO"],
  ["recordType", "Record type"],
  ["preparedBy", "Prepared by"],
];

const PO_FIELDS = [
  ["poNumber", "PO number"],
  ["vendorName", "Vendor"],
  ["paymentStatus", "Payment status"],
  ["jobNumber", "Job number"],
  ["poType", "PO type"],
];

function text(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function technicianOf(doc) {
  const sheets = [doc?.dcDatasheet, doc?.acDatasheet, doc?.pumpDatasheet, doc?.generatorDatasheet];
  for (const sheet of sheets) {
    const name = text(sheet?.technician);
    if (name) return name;
  }
  return "";
}

export function activityChanges(kind, previous, next) {
  const fields = kind === "purchaseOrder" ? PO_FIELDS : PROPOSAL_FIELDS;
  const changes = [];
  for (const [key, label] of fields) {
    const from = text(previous?.[key]);
    const to = text(next?.[key]);
    if (from !== to) changes.push({ field: label, from, to });
  }
  if (kind !== "purchaseOrder") {
    const from = technicianOf(previous);
    const to = technicianOf(next);
    if (from !== to) changes.push({ field: "Technician", from, to });
  }
  return changes.slice(0, 30);
}

function snapshotOf(doc) {
  if (!doc || typeof doc !== "object") return null;
  const copy = { ...doc };
  delete copy.__v;
  if (copy._id) copy._id = String(copy._id);
  return copy;
}

export function actorFromPortalUser(user) {
  const actorEmail = String(user?.email || "").trim().toLowerCase();
  const actorName = String(user?.contactName || user?.shopName || actorEmail).trim();
  return { actorEmail, actorName };
}

export async function recordActivity(entry) {
  try {
    const ownerEmail = String(entry?.ownerEmail || "").trim().toLowerCase();
    const action = String(entry?.action || "").trim();
    const recordKind = String(entry?.recordKind || "").trim();
    if (!ownerEmail || !action || !recordKind) return;
    await ActivityLog.create({
      ownerEmail,
      actorEmail: String(entry.actorEmail || "").trim().toLowerCase(),
      actorName: String(entry.actorName || "").trim().slice(0, 160),
      action,
      recordKind,
      recordId: String(entry.recordId || "").trim(),
      recordNumber: String(entry.recordNumber || "").trim().slice(0, 80),
      partyName: String(entry.partyName || "").trim().slice(0, 200),
      summary: String(entry.summary || "").trim().slice(0, 400),
      changes: Array.isArray(entry.changes) ? entry.changes.slice(0, 30) : [],
      snapshot: entry.snapshot ? snapshotOf(entry.snapshot) : null,
    });
  } catch (err) {
    console.error("Activity log write failed:", err);
  }
}
