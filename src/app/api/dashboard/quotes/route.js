import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import { normalizeQuotePartsLines, MAX_QUOTE_PARTS_LINES } from "@/lib/quote-parts-lines";
import { getNextRfqNumber } from "@/lib/dashboard-quote-rfq";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { defaultNewRfqStatusSlug, normalizeDashboardQuoteStatusSlug } from "@/lib/quote-status-slug";
import {
  todayQuoteDateString,
  defaultPreparedByEmployeeIdForPortalUser,
} from "@/lib/quote-defaults-shop";
import { normalizeTaxExempt, normalizeTaxPercent } from "@/lib/quote-invoice-totals";

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
    const { searchParams } = new URL(request.url);
    const includePagination =
      searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("q");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const q = { createdByEmail: email };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ rfqNumber: rx }, { status: rx }, { repairScope: rx }];
    }
    const [totalCount, list] = await Promise.all([
      Quote.countDocuments(q),
      Quote.find(q).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    ]);
    const listWithId = list.map((q) => ({
      ...q,
      id: q._id.toString(),
      _id: undefined,
      customerTaxExempt: normalizeTaxExempt(q.customerTaxExempt),
      customerTaxPercent: String(normalizeTaxPercent(q.customerTaxPercent)),
    }));
    if (!includePagination) return NextResponse.json(listWithId);
    return NextResponse.json({ items: listWithId, page, pageSize, totalCount });
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
    const customer = await Customer.findOne({ _id: customerId.trim(), createdByEmail: email })
      .select("taxExempt taxPercent")
      .lean();
    const customerTaxExempt = normalizeTaxExempt(customer?.taxExempt);
    const customerTaxPercent = String(normalizeTaxPercent(customer?.taxPercent));
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const merged = mergeUserSettings(settingsDoc?.settings);
    const rfqNumber = await getNextRfqNumber(email, merged);
    const dateStr = String(date ?? "").trim() || todayQuoteDateString();
    let preparedByStr = String(preparedBy ?? "").trim();
    if (!preparedByStr) {
      preparedByStr = await defaultPreparedByEmployeeIdForPortalUser(email, user.email);
    }
    const doc = await Quote.create({
      customerId: customerId.trim(),
      motorId: motorId.trim(),
      leadId: clampString(leadId, 100),
      status: normalizeDashboardQuoteStatusSlug(status, { defaultStatus: defaultNewRfqStatusSlug() }),
      customerPo: clampString(customerPo, 100),
      date: clampString(dateStr, 20),
      preparedBy: clampString(preparedByStr, 200),
      rfqNumber,
      repairScope: clampString(repairScope, LIMITS.message.max),
      laborTotal: laborFromLines || clampString(laborTotal, 50),
      partsTotal: partsFromLines || clampString(partsTotal, 50),
      scopeLines,
      partsLines,
      customerTaxExempt,
      customerTaxPercent,
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
