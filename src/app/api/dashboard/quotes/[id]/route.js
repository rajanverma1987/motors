import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import { normalizeQuotePartsLines, MAX_QUOTE_PARTS_LINES } from "@/lib/quote-parts-lines";

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

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Quote.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    })
      .lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const obj = doc;
    const attachmentsRaw = obj.attachments;
    const attachments = Array.isArray(attachmentsRaw)
      ? attachmentsRaw.map((a) => ({ url: a?.url ?? "", name: a?.name ?? (a?.url ?? "") }))
      : [];
    const out = {
      id: obj._id?.toString?.() ?? String(obj._id),
      customerId: obj.customerId ?? "",
      motorId: obj.motorId ?? "",
      leadId: obj.leadId ?? "",
      status: obj.status ?? "draft",
      customerPo: obj.customerPo ?? "",
      date: obj.date ?? "",
      preparedBy: obj.preparedBy ?? "",
      rfqNumber: obj.rfqNumber ?? "",
      repairScope: obj.repairScope ?? "",
      laborTotal: obj.laborTotal ?? "",
      partsTotal: obj.partsTotal ?? "",
      scopeLines: Array.isArray(obj.scopeLines) ? obj.scopeLines : [],
      partsLines: Array.isArray(obj.partsLines) ? obj.partsLines : [],
      estimatedCompletion: obj.estimatedCompletion ?? "",
      customerNotes: obj.customerNotes ?? "",
      notes: obj.notes ?? "",
      attachments,
      statusLog: Array.isArray(obj.statusLog)
        ? obj.statusLog.map((e) => {
            const at = e?.at;
            const atStr =
              at instanceof Date
                ? at.toISOString()
                : at && typeof at === "object" && typeof at.toISOString === "function"
                  ? at.toISOString()
                  : at != null
                    ? String(at)
                    : null;
            return {
              from: e?.from ?? "",
              to: e?.to ?? "",
              at: atStr,
              by: e?.by ?? "",
            };
          })
        : [],
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
    return NextResponse.json(out);
  } catch (err) {
    console.error("Dashboard get quote error:", err);
    return NextResponse.json({ error: "Failed to load quote" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Quote.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
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
    if (customerId !== undefined) {
      if (!String(customerId).trim()) {
        return NextResponse.json({ error: "Customer is required" }, { status: 400 });
      }
      doc.customerId = String(customerId).trim();
    }
    if (motorId !== undefined) {
      if (!String(motorId).trim()) {
        return NextResponse.json({ error: "Motor is required" }, { status: 400 });
      }
      doc.motorId = String(motorId).trim();
    }
    if (leadId !== undefined) doc.leadId = clampString(leadId, 100);
    if (status !== undefined && STATUS_VALUES.includes(status) && status !== doc.status) {
      if (!Array.isArray(doc.statusLog)) doc.statusLog = [];
      doc.statusLog.push({
        from: doc.status || "draft",
        to: status,
        at: new Date(),
        by: (user.contactName && user.contactName.trim()) || (user.shopName && user.shopName.trim()) || user.email?.trim() || "",
      });
      doc.markModified("statusLog");
      doc.status = status;
    }
    if (customerPo !== undefined) doc.customerPo = clampString(customerPo, 100);
    if (date !== undefined) doc.date = clampString(date, 20);
    if (preparedBy !== undefined) doc.preparedBy = clampString(preparedBy, 200);
    if (repairScope !== undefined) doc.repairScope = clampString(repairScope, LIMITS.message.max);
    if (bodyScopeLines !== undefined) {
      doc.scopeLines = normalizeScopeLines(bodyScopeLines);
      doc.laborTotal = doc.scopeLines.length ? sumPrices(doc.scopeLines) : (laborTotal !== undefined ? clampString(laborTotal, 50) : doc.laborTotal);
    } else if (laborTotal !== undefined) doc.laborTotal = clampString(laborTotal, 50);
    if (bodyPartsLines !== undefined) {
      doc.partsLines = normalizeQuotePartsLines(bodyPartsLines);
      doc.partsTotal = doc.partsLines.length ? sumPartsLines(doc.partsLines) : (partsTotal !== undefined ? clampString(partsTotal, 50) : doc.partsTotal);
    } else if (partsTotal !== undefined) doc.partsTotal = clampString(partsTotal, 50);
    if (estimatedCompletion !== undefined) doc.estimatedCompletion = clampString(estimatedCompletion, 100);
    if (customerNotes !== undefined) doc.customerNotes = clampString(customerNotes, LIMITS.message.max);
    if (notes !== undefined) doc.notes = clampString(notes, LIMITS.message.max);
    if (body.attachments !== undefined && Array.isArray(body.attachments)) {
      doc.attachments = body.attachments
        .filter((a) => a && typeof a.url === "string" && a.url.trim())
        .slice(0, 50)
        .map((a) => ({ url: a.url.trim(), name: clampString(a.name, 200) || a.url.trim() }));
    }
    await doc.save();
    return NextResponse.json({
      ok: true,
      quote: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard update quote error:", err);
    return NextResponse.json({ error: err.message || "Failed to update quote" }, { status: 500 });
  }
}
