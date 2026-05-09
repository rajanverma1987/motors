import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Quote from "@/models/Quote";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { normalizeTaxExempt, normalizeTaxPercent } from "@/lib/quote-invoice-totals";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { effectiveInvoiceNumberPrefix } from "@/lib/document-number-prefixes";

function normalizeLines(body) {
  const scopeLines = Array.isArray(body.scopeLines)
    ? body.scopeLines.slice(0, 200).map((r) => ({
        scope: String(r?.scope ?? "").slice(0, 2000),
        price: String(r?.price ?? "").slice(0, 50),
      }))
    : [];
  const partsLines = Array.isArray(body.partsLines)
    ? body.partsLines.slice(0, 200).map((r) => ({
        item: String(r?.item ?? "").slice(0, 500),
        qty: String(r?.qty ?? "").slice(0, 50),
        uom: String(r?.uom ?? "").slice(0, 50),
        price: String(r?.price ?? "").slice(0, 50),
      }))
    : [];
  return { scopeLines, partsLines };
}

function createCustomerViewToken() {
  return crypto.randomBytes(24).toString("hex");
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const { searchParams } = new URL(request.url);
    const includePagination =
      searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("q");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const sortBy = String(searchParams.get("sortBy") || "createdAt").trim();
    const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      invoiceNumber: "invoiceNumber",
      date: "date",
      status: "status",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const q = { createdByEmail: email };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ invoiceNumber: rx }, { rfqNumber: rx }, { status: rx }];
    }
    const [totalCount, list] = await Promise.all([
      Invoice.countDocuments(q),
      Invoice.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
    ]);
    const summaryRows = await Invoice.aggregate([
      { $match: q },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: {
            $sum: {
              $add: [
                { $convert: { input: "$laborTotal", to: "double", onError: 0, onNull: 0 } },
                { $convert: { input: "$partsTotal", to: "double", onError: 0, onNull: 0 } },
              ],
            },
          },
        },
      },
    ]);
    const summaryByStatus = {};
    for (const row of summaryRows) {
      const key = String(row?._id || "draft").trim() || "draft";
      summaryByStatus[key] = {
        count: Number(row?.count) || 0,
        amount: Number(row?.amount) || 0,
      };
    }
    const customerIds = [...new Set(list.map((i) => String(i.customerId)))];
    const customers = await Customer.find({
      _id: { $in: customerIds },
      createdByEmail: email,
    })
      .lean()
      .catch(() => []);
    const custMap = Object.fromEntries(
      (customers || []).map((c) => [
        String(c._id),
        c.companyName || c.primaryContactName || String(c._id),
      ])
    );
    const items = list.map((inv) => ({
        id: inv._id.toString(),
        quoteId: inv.quoteId,
        invoiceNumber: inv.invoiceNumber,
        rfqNumber: inv.rfqNumber,
        date: inv.date,
        status: inv.status,
        laborTotal: inv.laborTotal,
        partsTotal: inv.partsTotal,
        customerTaxExempt: normalizeTaxExempt(inv.customerTaxExempt),
        customerTaxPercent: String(normalizeTaxPercent(inv.customerTaxPercent)),
        customerId: inv.customerId,
        motorId: inv.motorId,
        customerName: custMap[String(inv.customerId)] || inv.customerId,
        createdAt: inv.createdAt,
      }));
    if (!includePagination) return NextResponse.json(items);
    return NextResponse.json({ items, page, pageSize, totalCount, summaryByStatus });
  } catch (err) {
    console.error("Invoices list:", err);
    return NextResponse.json({ error: err.message || "Failed to list" }, { status: 500 });
  }
}

export async function POST(request) {
  let ownerEmailForDup = "";
  let quoteIdForDup = "";
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    ownerEmailForDup = email;
    const body = await request.json().catch(() => ({}));
    const quoteId = String(body.quoteId || "").trim();
    quoteIdForDup = quoteId;
    if (!quoteId) {
      return NextResponse.json({ error: "quoteId required" }, { status: 400 });
    }
    await connectDB();
    const dup = await Invoice.findOne({ createdByEmail: email, quoteId }).lean();
    if (dup) {
      return NextResponse.json(
        { error: "An invoice already exists for this quote. Open it to edit.", existingId: dup._id.toString() },
        { status: 409 }
      );
    }
    const quote = await Quote.findOne({ _id: quoteId, createdByEmail: email }).lean();
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    const customer = await Customer.findOne({ _id: quote.customerId, createdByEmail: email })
      .select("taxExempt taxPercent")
      .lean();
    const { scopeLines, partsLines } = normalizeLines(body);
    const rfq = (quote.rfqNumber || "").trim() || String(quoteId).slice(-8);
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const u = mergeUserSettings(settingsDoc?.settings);
    const invPrefix = effectiveInvoiceNumberPrefix(u);
    const invoiceNumber = invPrefix ? `${invPrefix}${rfq}` : rfq;
    const doc = await Invoice.create({
      quoteId,
      customerId: String(quote.customerId || ""),
      motorId: String(quote.motorId || ""),
      invoiceNumber,
      rfqNumber: quote.rfqNumber || "",
      customerPo: String(body.customerPo ?? quote.customerPo ?? "").slice(0, 200),
      date: String(body.date ?? quote.date ?? "").slice(0, 50),
      preparedBy: String(body.preparedBy ?? "").slice(0, 200),
      scopeLines,
      partsLines,
      laborTotal: String(body.laborTotal ?? "").slice(0, 50),
      partsTotal: String(body.partsTotal ?? "").slice(0, 50),
      customerTaxExempt: normalizeTaxExempt(quote.customerTaxExempt ?? customer?.taxExempt),
      customerTaxPercent: String(normalizeTaxPercent(quote.customerTaxPercent ?? customer?.taxPercent)),
      estimatedCompletion: String(body.estimatedCompletion ?? "").slice(0, 200),
      customerNotes: String(body.customerNotes ?? "").slice(0, 8000),
      notes: String(body.notes ?? "").slice(0, 8000),
      status: normalizeInvoiceStatusSlug(body.status),
      // Keep non-empty to avoid duplicate-key conflicts on legacy customerViewToken indexes.
      customerViewToken: createCustomerViewToken(),
      createdByEmail: email,
    });
    const o = doc.toObject();
    return NextResponse.json({ ok: true, invoice: { ...o, id: doc._id.toString(), _id: undefined } });
  } catch (err) {
    console.error("Invoice create:", err);
    if (err.code === 11000) {
      const dupKey = Object.keys(err?.keyPattern || {})[0] || "";
      if (dupKey === "customerViewToken") {
        return NextResponse.json(
          { error: "Invoice token conflict. Please try Save again." },
          { status: 409 },
        );
      }
      try {
        if (ownerEmailForDup && quoteIdForDup) {
          const dup = await Invoice.findOne({ createdByEmail: ownerEmailForDup, quoteId: quoteIdForDup }).lean();
          if (dup) {
            return NextResponse.json(
              {
                error: "An invoice already exists for this quote. Open it to edit.",
                existingId: dup._id.toString(),
              },
              { status: 409 },
            );
          }
        }
      } catch {
        /* ignore and fallback below */
      }
      return NextResponse.json({ error: "Invoice already exists for this quote." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Failed to create" }, { status: 500 });
  }
}
