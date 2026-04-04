import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairInspection from "@/models/MotorRepairInspection";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import {
  buildFinalQuoteFromDetailedInspections,
  buildPreliminaryQuoteFromInspections,
} from "@/lib/repair-flow-preliminary-quote";
import { sanitizeFlowQuoteLineItems } from "@/lib/repair-flow-sanitize-line-items";
import { preliminaryLineItemsToScopeLines } from "@/lib/repair-flow-quote-form-map";
import { LIMITS, clampString } from "@/lib/validation";
import { normalizeQuotePartsLines, MAX_QUOTE_PARTS_LINES } from "@/lib/quote-parts-lines";
import { getNextRfqNumber } from "@/lib/dashboard-quote-rfq";
import {
  todayQuoteDateString,
  defaultPreparedByEmployeeIdForPortalUser,
} from "@/lib/quote-defaults-shop";

function toPublic(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return { ...o, id: o._id.toString(), _id: undefined };
}

function normalizeScopeLines(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_QUOTE_PARTS_LINES).map((row) => ({
    scope: clampString(row?.scope, LIMITS.message.max),
    price: clampString(row?.price, 50),
  }));
}

function sumPrices(lines, priceKey = "price") {
  let sum = 0;
  for (const row of lines) {
    const p = parseFloat(row?.[priceKey]);
    if (Number.isFinite(p)) sum += p;
  }
  return sum.toFixed(2);
}

function sumPartsLines(lines) {
  let sum = 0;
  for (const row of lines) {
    const q = parseFloat(row?.qty ?? "1");
    const p = parseFloat(row?.price ?? "0");
    if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
  }
  return sum.toFixed(2);
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid job" }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await MotorRepairJob.findOne({ _id: id, createdByEmail: email });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!["intake", "pre_inspection", "disassembly_detailed", "final_quote"].includes(job.phase)) {
      return NextResponse.json(
        {
          error:
            "Final quote can be created from intake (manual scope), pre-inspection, or after detailed inspection.",
        },
        { status: 400 }
      );
    }
    const customerId = String(job.customerId || "").trim();
    const motorId = String(job.motorId || "").trim();
    if (!customerId || !motorId || !mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(motorId)) {
      return NextResponse.json(
        { error: "Assign a customer and motor on this job before creating the final quote" },
        { status: 400 }
      );
    }

    const [cust, mot] = await Promise.all([
      Customer.findOne({ _id: customerId, createdByEmail: email }).lean(),
      Motor.findOne({ _id: motorId, createdByEmail: email }).lean(),
    ]);
    if (!cust || !mot) {
      return NextResponse.json(
        { error: "Job customer or motor is missing or invalid for CRM quote" },
        { status: 400 }
      );
    }

    const detailedInspections = await MotorRepairInspection.find({
      jobId: id,
      createdByEmail: email,
      kind: "detailed",
    }).lean();

    const preliminaryInspections = await MotorRepairInspection.find({
      jobId: id,
      createdByEmail: email,
      kind: "preliminary",
    }).lean();

    const rawBody = await request.json().catch(() => ({}));
    let lineItems;
    let quoteNotes;
    let scopeLinesForLegacy = [];
    let partsLinesForLegacy = [];

    if (Array.isArray(rawBody.lineItems) && rawBody.lineItems.length > 0) {
      lineItems = sanitizeFlowQuoteLineItems(rawBody.lineItems);
      if (lineItems.length === 0) {
        return NextResponse.json({ error: "At least one scope or cost line with a description is required" }, { status: 400 });
      }
      quoteNotes = clampString(typeof rawBody.quoteNotes === "string" ? rawBody.quoteNotes : "", 8000);
      scopeLinesForLegacy = normalizeScopeLines(rawBody.scopeLines);
      partsLinesForLegacy = normalizeQuotePartsLines(rawBody.partsLines);
      if (scopeLinesForLegacy.length === 0 && partsLinesForLegacy.length === 0) {
        scopeLinesForLegacy = preliminaryLineItemsToScopeLines(lineItems).filter((r) => String(r.scope || "").trim());
      }
    } else {
      const mapRows = (rows) => rows.map((r) => ({ component: r.component, findings: r.findings || {} }));
      let built;
      if (detailedInspections.length > 0) {
        built = buildFinalQuoteFromDetailedInspections(mapRows(detailedInspections));
      } else if (preliminaryInspections.length > 0) {
        built = buildPreliminaryQuoteFromInspections(mapRows(preliminaryInspections));
      } else {
        return NextResponse.json(
          { error: "Add at least one pre-inspection or detailed inspection, or submit scope line items in the request body" },
          { status: 400 }
        );
      }
      lineItems = built.lineItems;
      quoteNotes = built.quoteNotes;
      scopeLinesForLegacy = preliminaryLineItemsToScopeLines(lineItems).filter((r) => String(r.scope || "").trim());
    }

    const rfqNumber = await getNextRfqNumber(email);
    const laborFromLines = scopeLinesForLegacy.length ? sumPrices(scopeLinesForLegacy) : "";
    const partsFromLines = partsLinesForLegacy.length ? sumPartsLines(partsLinesForLegacy) : "";

    const quoteDate = todayQuoteDateString();
    const preparedByEmpId = await defaultPreparedByEmployeeIdForPortalUser(email, user.email);

    const crmQuote = await Quote.create({
      customerId,
      motorId,
      leadId: "",
      status: "draft",
      date: quoteDate,
      preparedBy: preparedByEmpId,
      rfqNumber,
      repairFlowJobId: String(id),
      motorRepairFlowQuoteId: "",
      repairScope: "",
      laborTotal: laborFromLines,
      partsTotal: partsFromLines,
      scopeLines: scopeLinesForLegacy,
      partsLines: partsLinesForLegacy,
      estimatedCompletion: "",
      customerNotes: "",
      notes: quoteNotes,
      createdByEmail: email,
    });

    const crmIdStr = crmQuote._id.toString();
    const hadPrimaryFinal = !!String(job.finalFlowQuoteId || "").trim();
    if (!hadPrimaryFinal) {
      job.finalFlowQuoteId = crmIdStr;
      job.phase = "awaiting_final_approval";
    }
    await job.save();

    return NextResponse.json({
      ok: true,
      job: toPublic(job),
      legacyQuote: {
        id: crmIdStr,
        rfqNumber: crmQuote.rfqNumber,
      },
    });
  } catch (err) {
    console.error("generate-final-quote:", err);
    return NextResponse.json({ error: err.message || "Failed to generate final quote" }, { status: 500 });
  }
}
