import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import { normalizeQuotePartsLines, MAX_QUOTE_PARTS_LINES } from "@/lib/quote-parts-lines";
import { getNextRfqNumber } from "@/lib/dashboard-quote-rfq";
import {
  todayQuoteDateString,
  defaultPreparedByEmployeeIdForPortalUser,
} from "@/lib/quote-defaults-shop";

const STATUS_VALUES = ["draft", "sent", "approved", "rejected", "rnr"];

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

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await Quote.find({ createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    const listWithId = list.map((q) => ({
      ...q,
      id: q._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("Dashboard list quotes error:", err);
    return NextResponse.json({ error: "Failed to list quotes" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await request.json();
    const {
      customerId,
      motorId,
      leadId,
      status,
      repairScope,
      laborTotal,
      partsTotal,
      scopeLines: bodyScopeLines,
      partsLines: bodyPartsLines,
      estimatedCompletion,
      customerNotes,
      notes,
      customerPo,
      date,
      preparedBy,
    } = body;
    if (!customerId?.trim()) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }
    if (!motorId?.trim()) {
      return NextResponse.json({ error: "Motor is required" }, { status: 400 });
    }
    const scopeLines = normalizeScopeLines(bodyScopeLines);
    const partsLines = normalizeQuotePartsLines(bodyPartsLines);
    const laborFromLines = scopeLines.length ? sumPrices(scopeLines) : "";
    const partsFromLines = partsLines.length ? sumPartsLines(partsLines) : "";
    const email = user.email.trim().toLowerCase();
    const rfqNumber = await getNextRfqNumber(email);
    const dateStr = String(date ?? "").trim() || todayQuoteDateString();
    let preparedByStr = String(preparedBy ?? "").trim();
    if (!preparedByStr) {
      preparedByStr = await defaultPreparedByEmployeeIdForPortalUser(email, user.email);
    }
    const doc = await Quote.create({
      customerId: customerId.trim(),
      motorId: motorId.trim(),
      leadId: clampString(leadId, 100),
      status: status && STATUS_VALUES.includes(status) ? status : "draft",
      customerPo: clampString(customerPo, 100),
      date: clampString(dateStr, 20),
      preparedBy: clampString(preparedByStr, 200),
      rfqNumber,
      repairScope: clampString(repairScope, LIMITS.message.max),
      laborTotal: laborFromLines || clampString(laborTotal, 50),
      partsTotal: partsFromLines || clampString(partsTotal, 50),
      scopeLines,
      partsLines,
      estimatedCompletion: clampString(estimatedCompletion, 100),
      customerNotes: clampString(customerNotes, LIMITS.message.max),
      notes: clampString(notes, LIMITS.message.max),
      createdByEmail: email,
    });
    return NextResponse.json({
      ok: true,
      quote: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard create quote error:", err);
    return NextResponse.json({ error: err.message || "Failed to create quote" }, { status: 500 });
  }
}
