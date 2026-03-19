import { connectDB } from "@/lib/db";
import SupportTicketCounter from "@/models/SupportTicketCounter";
import { SUPPORT_TICKET_CATEGORIES, SUPPORT_TICKET_STATUSES } from "@/models/SupportTicket";
import { LIMITS, clampString } from "@/lib/validation";

const SUPPORT_UPLOAD_PREFIX = "/uploads/support/";
const MAX_ATTACHMENTS = 6;

/** Accept only URLs we stored under public/uploads/support */
export function normalizeSupportAttachments(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw.slice(0, MAX_ATTACHMENTS)) {
    const s = clampString(String(item ?? ""), LIMITS.url.max).trim();
    if (!s.startsWith(SUPPORT_UPLOAD_PREFIX)) continue;
    if (s.includes("..") || s.includes("\\")) continue;
    out.push(s);
  }
  return [...new Set(out)];
}

export function formatTicketRef(ticketNumber) {
  const n = Number(ticketNumber);
  if (!Number.isFinite(n) || n < 1) return "SUP-?";
  return `SUP-${n}`;
}

export async function allocateSupportTicketNumber() {
  await connectDB();
  const doc = await SupportTicketCounter.findOneAndUpdate(
    { _id: "support" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return doc?.seq ?? 1;
}

export function normalizeCategory(raw) {
  const c = String(raw || "").trim().toLowerCase();
  return SUPPORT_TICKET_CATEGORIES.includes(c) ? c : "other";
}

export function normalizeStatus(raw) {
  const s = String(raw || "").trim().toLowerCase().replace(/-/g, "_");
  const map = { waitingcustomer: "waiting_customer" };
  const key = map[s] || s;
  return SUPPORT_TICKET_STATUSES.includes(key) ? key : null;
}

export function ticketToListRow(doc) {
  const o = doc?.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    ticketRef: formatTicketRef(o.ticketNumber),
    ticketNumber: o.ticketNumber,
    subject: o.subject ?? "",
    category: o.category ?? "other",
    status: o.status ?? "open",
    createdByEmail: o.createdByEmail ?? "",
    shopName: o.shopName ?? "",
    updatedAt: o.updatedAt,
    createdAt: o.createdAt,
    replyCount: Array.isArray(o.replies) ? o.replies.length : 0,
    attachmentCount: Array.isArray(o.attachments) ? o.attachments.length : 0,
  };
}

export function ticketToDetail(doc) {
  const row = ticketToListRow(doc);
  const o = doc?.toObject ? doc.toObject() : doc;
  return {
    ...row,
    contactName: o.contactName ?? "",
    description: o.description ?? "",
    attachments: Array.isArray(o.attachments) ? o.attachments.filter(Boolean) : [],
    replies: (Array.isArray(o.replies) ? o.replies : []).map((r) => ({
      id: r._id ? String(r._id) : undefined,
      from: r.from,
      authorEmail: r.authorEmail ?? "",
      body: r.body ?? "",
      createdAt: r.createdAt,
    })),
  };
}
