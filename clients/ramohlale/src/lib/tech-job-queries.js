import mongoose from "mongoose";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import WorkOrder from "@/models/WorkOrder";
import { WRITE_UP_QUOTE_STATUS, isWriteUpStatus } from "@/lib/quote-rfq-lifecycle";
import { withOpenWorkOrderStatusFilter } from "@/lib/work-order-open-status";
import { motorNameplateFromLean } from "@/lib/motor-nameplate-patch";

/** Mongo filter for RFQs in Write-Up status (regex + in-app isWriteUpStatus for edge cases). */
export function writeUpQuoteStatusFilter() {
  return { status: { $regex: /^write[\s_-]*up$/i } };
}

/**
 * Match technicianEmployeeId on Quote (string field; tolerate case / whitespace).
 * @param {string} assigneeId
 */
export function technicianEmployeeIdFilter(assigneeId) {
  const techId = String(assigneeId || "").trim();
  if (!techId) return { technicianEmployeeId: { $in: [] } };

  const clauses = [{ technicianEmployeeId: techId }];
  if (/^[a-f0-9]{24}$/i.test(techId)) {
    clauses.push({ technicianEmployeeId: { $regex: new RegExp(`^\\s*${techId}\\s*$`, "i") } });
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

/**
 * Quote ids still in Write-Up — work orders for these quotes are hidden from the mobile WO list.
 * @param {string} shopEmail
 */
export async function getWriteUpQuoteIds(shopEmail) {
  const email = String(shopEmail || "")
    .trim()
    .toLowerCase();
  if (!email) return [];
  const rows = await Quote.find({ createdByEmail: email })
    .select({ _id: 1, status: 1 })
    .lean();
  return rows.filter((r) => isWriteUpStatus(r.status)).map((r) => r._id.toString());
}

/**
 * Open work orders for a technician, excluding jobs tied to Write-Up RFQs.
 * @param {string} shopEmail
 * @param {string} assigneeId
 * @param {string[]} [writeUpQuoteIds]
 */
export function technicianOpenWorkOrderFilter(shopEmail, assigneeId, writeUpQuoteIds = []) {
  const techFilter = technicianEmployeeIdFilter(assigneeId);
  const base = withOpenWorkOrderStatusFilter({
    createdByEmail: shopEmail,
    ...techFilter,
  });
  const exclude = (writeUpQuoteIds || []).filter(Boolean);
  if (!exclude.length) return base;
  return {
    $and: [base, { quoteId: { $nin: exclude } }],
  };
}

/**
 * Write-Up RFQs assigned to a technician (mobile pre-inspection list).
 * @param {string} shopEmail
 * @param {string} assigneeId
 */
export async function listWriteUpPreInspectionsForTechnician(shopEmail, assigneeId) {
  const email = String(shopEmail || "")
    .trim()
    .toLowerCase();
  const techId = String(assigneeId || "").trim();
  if (!email || !techId) return [];

  const quotes = await Quote.find({
    createdByEmail: email,
    ...technicianEmployeeIdFilter(techId),
  })
    .sort({ updatedAt: -1 })
    .limit(150)
    .lean();

  const writeUpQuotes = quotes.filter((q) => isWriteUpStatus(q.status));
  if (!writeUpQuotes.length) return [];

  const customerIds = [...new Set(writeUpQuotes.map((q) => String(q.customerId || "").trim()).filter(Boolean))];
  const motorIds = [...new Set(writeUpQuotes.map((q) => String(q.motorId || "").trim()).filter(Boolean))];

  const customerObjectIds = customerIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  const motorObjectIds = motorIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));

  const [customers, motors] = await Promise.all([
    customerObjectIds.length
      ? Customer.find({ _id: { $in: customerObjectIds }, createdByEmail: email })
          .select({ companyName: 1, primaryContactName: 1 })
          .lean()
      : [],
    motorObjectIds.length
      ? Motor.find({ _id: { $in: motorObjectIds }, createdByEmail: email })
          .select({ serialNumber: 1, manufacturer: 1, model: 1, motorType: 1 })
          .lean()
      : [],
  ]);

  const custMap = Object.fromEntries(
    customers.map((c) => [
      c._id.toString(),
      (c.companyName && String(c.companyName).trim()) ||
        (c.primaryContactName && String(c.primaryContactName).trim()) ||
        "",
    ])
  );
  const motorMap = Object.fromEntries(motors.map((m) => [m._id.toString(), m]));

  return writeUpQuotes.map((q) => {
    const id = q._id.toString();
    const motor = motorMap[String(q.motorId || "")] || null;
    const motorLabel = motor
      ? [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ")
      : "";
    return {
      id,
      kind: "pre_inspection",
      rfqNumber: q.rfqNumber || "",
      status: q.status || WRITE_UP_QUOTE_STATUS,
      companyName: custMap[String(q.customerId || "")] || "",
      motorLabel,
      date: q.date || "",
      updatedAt: q.updatedAt ? new Date(q.updatedAt).toISOString() : null,
    };
  });
}

/**
 * @param {object} tech — from getTechnicianFromRequest
 * @param {string} quoteId
 */
export async function loadWriteUpQuoteForTechnician(tech, quoteId) {
  const email = tech.shopEmail.trim().toLowerCase();
  const techId = String(tech.employeeId || "").trim();
  const qid = String(quoteId || "").trim();
  if (!qid || !techId) return null;

  const quoteQuery = { createdByEmail: email };
  if (mongoose.Types.ObjectId.isValid(qid)) {
    quoteQuery._id = new mongoose.Types.ObjectId(qid);
  } else {
    quoteQuery._id = qid;
  }

  const quote = await Quote.findOne(quoteQuery).lean();

  if (!quote || !isWriteUpStatus(quote.status)) return null;

  const assignedTech = String(quote.technicianEmployeeId || "").trim();
  const techMatch =
    assignedTech === techId ||
    (assignedTech && techId && assignedTech.toLowerCase() === techId.toLowerCase());
  if (!techMatch) return null;

  const customerId = quote.customerId;
  const motorId = quote.motorId;

  const [customer, motor] = await Promise.all([
    customerId
      ? Customer.findOne({
          _id: mongoose.Types.ObjectId.isValid(String(customerId))
            ? new mongoose.Types.ObjectId(String(customerId))
            : customerId,
          createdByEmail: email,
        })
          .select({ companyName: 1, primaryContactName: 1 })
          .lean()
      : null,
    motorId
      ? Motor.findOne({
          _id: mongoose.Types.ObjectId.isValid(String(motorId))
            ? new mongoose.Types.ObjectId(String(motorId))
            : motorId,
          createdByEmail: email,
        }).lean()
      : null,
  ]);

  const companyName =
    (customer?.companyName && String(customer.companyName).trim()) ||
    (customer?.primaryContactName && String(customer.primaryContactName).trim()) ||
    "";

  return {
    quote: {
      id: quote._id.toString(),
      rfqNumber: quote.rfqNumber || "",
      status: quote.status || WRITE_UP_QUOTE_STATUS,
      date: quote.date || "",
      customerPo: quote.customerPo || "",
      estimatedCompletion: quote.estimatedCompletion || "",
      customerId: quote.customerId || "",
      motorId: quote.motorId || "",
    },
    companyName,
    motor: motorNameplateFromLean(motor),
    motorClass: motor?.motorType?.toLowerCase?.().includes("dc") ? "DC" : "AC",
  };
}
