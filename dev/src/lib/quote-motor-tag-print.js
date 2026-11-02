import mongoose from "mongoose";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import Employee from "@/models/Employee";
import { motorNameplateFromLean } from "@/lib/motor-nameplate-patch";
import { JOB_TYPE_OPTIONS } from "@/lib/work-order-fields";

const EMPTY_TAG_EXTRAS = {
  technicianName: "",
  workOrderNumber: "",
  workOrderStatus: "",
  jobTypeLabel: "",
  motorClass: "",
  repairJobNumber: "",
  estimatedCompletion: "",
  customerPo: "",
  scopeBrief: "",
};

function jobTypeLabelFromValue(value) {
  const v = String(value ?? "").trim();
  return JOB_TYPE_OPTIONS.find((o) => o.value === v)?.label || v;
}

function scopeBriefFromQuote(quote) {
  const lines = Array.isArray(quote?.scopeLines) ? quote.scopeLines : [];
  for (const row of lines) {
    const t = String(row?.scope ?? "").trim();
    if (t) return t.length > 140 ? `${t.slice(0, 137)}…` : t;
  }
  const rs = String(quote?.repairScope ?? "").trim();
  if (rs) return rs.length > 140 ? `${rs.slice(0, 137)}…` : rs;
  return "";
}

function tagExtrasFromWorkOrderAndQuote(wo, quoteLean) {
  const extras = { ...EMPTY_TAG_EXTRAS };
  if (wo) {
    extras.workOrderNumber = String(wo.workOrderNumber ?? "").trim();
    extras.workOrderStatus = String(wo.status ?? "").trim();
    extras.motorClass = String(wo.motorClass ?? "").trim();
    extras.repairJobNumber = String(wo.repairJobNumber ?? "").trim();
    extras.jobTypeLabel = jobTypeLabelFromValue(wo.jobType);
  }
  if (quoteLean) {
    extras.estimatedCompletion = String(quoteLean.estimatedCompletion ?? "").trim();
    extras.customerPo = String(quoteLean.customerPo ?? "").trim();
    extras.scopeBrief = scopeBriefFromQuote(quoteLean);
  }
  return extras;
}

async function resolveTechnicianName(email, employeeId) {
  const shopEmail = String(email || "")
    .trim()
    .toLowerCase();
  const empId = String(employeeId ?? "").trim();
  if (!empId || !mongoose.isValidObjectId(empId)) return "";
  const emp = await Employee.findOne({ _id: empId, createdByEmail: shopEmail })
    .select({ name: 1 })
    .lean();
  return String(emp?.name || "").trim();
}

/**
 * Latest linked work order + quote fields for Tag QR print.
 */
async function resolveLinkedWorkOrderTagExtras(email, { quoteId, repairFlowJobId, quoteLean } = {}) {
  const shopEmail = String(email || "")
    .trim()
    .toLowerCase();
  const qid = String(quoteId ?? "").trim();
  const jid = String(repairFlowJobId ?? "").trim();

  const tryWo = async (filter) =>
    WorkOrder.findOne({ createdByEmail: shopEmail, ...filter })
      .sort({ updatedAt: -1 })
      .lean();

  let wo = null;
  if (qid && mongoose.isValidObjectId(qid)) {
    wo = await tryWo({ quoteId: qid });
  }
  if (!wo && jid && mongoose.isValidObjectId(jid)) {
    wo = await tryWo({ repairFlowJobId: jid });
  }

  let quote = quoteLean || null;
  if (!quote && wo?.quoteId && mongoose.isValidObjectId(String(wo.quoteId))) {
    quote = await Quote.findOne({ _id: wo.quoteId, createdByEmail: shopEmail })
      .select({
        estimatedCompletion: 1,
        customerPo: 1,
        scopeLines: 1,
        repairScope: 1,
      })
      .lean();
  }

  let technicianName = wo
    ? await resolveTechnicianName(shopEmail, wo.technicianEmployeeId)
    : "";
  if (!technicianName && quoteLean?.technicianEmployeeId) {
    technicianName = await resolveTechnicianName(shopEmail, quoteLean.technicianEmployeeId);
  }

  return {
    technicianName,
    ...tagExtrasFromWorkOrderAndQuote(wo, quote),
  };
}

/**
 * Assigned technician name from the latest work order for this quote or repair job.
 */
export async function resolveTechnicianNameForTag(email, { quoteId, repairFlowJobId } = {}) {
  const { technicianName } = await resolveLinkedWorkOrderTagExtras(email, {
    quoteId,
    repairFlowJobId,
  });
  return technicianName;
}

/**
 * Customer + motor + technician context for Tag QR print from a CRM quote (RFQ).
 */
export async function getMotorTagPrintContextForQuote(quoteLean, userEmail) {
  const email = String(userEmail || "")
    .trim()
    .toLowerCase();
  const quoteId = String(quoteLean?._id ?? quoteLean?.id ?? "").trim();
  const customerId = String(quoteLean?.customerId ?? "").trim();
  if (!customerId || !mongoose.isValidObjectId(customerId)) {
    return {
      customerId: "",
      customerName: "",
      motor: null,
      motorFallbackLine: "",
      rfqNumber: "",
      ...EMPTY_TAG_EXTRAS,
    };
  }

  const motorId = String(quoteLean?.motorId ?? "").trim();
  const repairFlowJobId = String(quoteLean?.repairFlowJobId ?? "").trim();

  const [customer, motor, tagExtras] = await Promise.all([
    Customer.findOne({ _id: customerId, createdByEmail: email }).lean(),
    motorId && mongoose.isValidObjectId(motorId)
      ? Motor.findOne({ _id: motorId, createdByEmail: email }).lean()
      : Promise.resolve(null),
    resolveLinkedWorkOrderTagExtras(email, {
      quoteId,
      repairFlowJobId,
      quoteLean,
    }),
  ]);

  const customerName =
    (customer?.companyName && String(customer.companyName).trim()) ||
    (customer?.primaryContactName && String(customer.primaryContactName).trim()) ||
    "";

  const motorFallbackLine = motor
    ? [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ") ||
      motorId
    : "";

  return {
    customerId,
    customerName,
    motor: motorNameplateFromLean(motor),
    motorFallbackLine,
    rfqNumber: String(quoteLean?.rfqNumber ?? "").trim(),
    ...tagExtras,
  };
}

/**
 * Tag QR context from a repair-flow job (modal / job detail).
 */
export async function getMotorTagPrintContextForRepairJob(jobLean, userEmail) {
  const email = String(userEmail || "")
    .trim()
    .toLowerCase();
  const jobId = String(jobLean?._id ?? jobLean?.id ?? "").trim();
  const customerId = String(jobLean?.customerId ?? "").trim();
  if (!customerId || !mongoose.isValidObjectId(customerId)) {
    return {
      customerId: "",
      customerName: "",
      motor: null,
      motorFallbackLine: "",
      rfqNumber: "",
      ...EMPTY_TAG_EXTRAS,
    };
  }

  const motorId = String(jobLean?.motorId ?? "").trim();
  const finalQuoteId = String(jobLean?.finalFlowQuoteId ?? "").trim();

  let quoteLean = null;
  if (finalQuoteId && mongoose.isValidObjectId(finalQuoteId)) {
    quoteLean = await Quote.findOne({ _id: finalQuoteId, createdByEmail: email })
      .select({
        estimatedCompletion: 1,
        customerPo: 1,
        scopeLines: 1,
        repairScope: 1,
      })
      .lean();
  }

  const [customer, motor, tagExtras] = await Promise.all([
    Customer.findOne({ _id: customerId, createdByEmail: email }).lean(),
    motorId && mongoose.isValidObjectId(motorId)
      ? Motor.findOne({ _id: motorId, createdByEmail: email }).lean()
      : Promise.resolve(null),
    resolveLinkedWorkOrderTagExtras(email, {
      quoteId: finalQuoteId,
      repairFlowJobId: jobId,
      quoteLean,
    }),
  ]);

  const customerName =
    (customer?.companyName && String(customer.companyName).trim()) ||
    (customer?.primaryContactName && String(customer.primaryContactName).trim()) ||
    (jobLean?.customerLabel && String(jobLean.customerLabel).trim()) ||
    "";

  const motorFallbackLine = motor
    ? [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ") ||
      motorId
    : String(jobLean?.motorLabel ?? "").trim();

  return {
    customerId,
    customerName,
    motor: motorNameplateFromLean(motor),
    motorFallbackLine,
    rfqNumber: String(jobLean?.jobNumber ?? "").trim(),
    ...tagExtras,
  };
}
