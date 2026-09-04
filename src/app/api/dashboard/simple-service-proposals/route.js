import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  sanitizeSimplePortalPayload,
  serializeSimplePortalDoc,
} from "@/lib/simple-portal-mongo";
import { applySimpleServiceProposalInventoryLifecycle } from "@/lib/inventory-service";
import { emitCrmResourceEvent } from "@/lib/integration-webhooks";
import { notifySimpleJobBoardFromSp } from "@/lib/job-board-emit";
import { enqueueQuickBooksSync } from "@/lib/quickbooks/triggers";
import {
  andMongoClauses,
  invoiceFinanceAddFieldsStages,
  loadMergedSettingsForEmail,
  mongoInvoiceKindClause,
  mongoProposalKindClause,
  mongoSpDateRangeClause,
  mongoStatusFilterClause,
  simpleSpSortField,
  statusSortRankExpression,
} from "@/lib/simple-service-proposal-list-query";
import {
  assertSimplePortalJobNumberAvailable,
  createSimpleServiceProposalWithUniqueJobNumber,
} from "@/lib/simple-portal-job-numbers";

function emptyInvoiceFinance() {
  return {
    amountReceivable: { count: 0, amount: 0 },
    taxCollected: { count: 0, amount: 0 },
    taxToCollect: { count: 0, amount: 0 },
  };
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100 || 0;
}

/**
 * Mongo expression: logistics charge-back amount for one receiving/shipping field path.
 * Mirrors resolveChargeBackToClient + logisticsChargeBackAmount in simple-motor-logistics.
 */
function logisticsChargeBackMongoExpr(path) {
  const charges = {
    $convert: { input: `$${path}.charges`, to: "double", onError: 0, onNull: 0 },
  };
  const paidByCustomer = {
    $eq: [
      {
        $toLower: {
          $trim: { input: { $ifNull: [`$${path}.paidBy`, ""] } },
        },
      },
      "customer",
    ],
  };
  return {
    $cond: [
      {
        $and: [
          { $gt: [charges, 0] },
          {
            $or: [
              { $eq: [`$${path}.chargeBackToClient`, true] },
              {
                $and: [
                  { $ne: [`$${path}.chargeBackToClient`, true] },
                  { $ne: [`$${path}.chargeBackToClient`, false] },
                  paidByCustomer,
                ],
              },
            ],
          },
        ],
      },
      charges,
      0,
    ],
  };
}

const LOGISTIC_CHARGES_TOTAL_EXPR = {
  $add: [
    logisticsChargeBackMongoExpr("motorReceiving"),
    logisticsChargeBackMongoExpr("motorShipping"),
  ],
};

async function loadInvoiceFinanceSummary(baseMatch) {
  const rows = await SimpleServiceProposal.aggregate([
    { $match: baseMatch },
    ...invoiceFinanceAddFieldsStages(),
    {
      $facet: {
        amountReceivable: [
          { $match: { _spBalance: { $gt: 0.005 } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              amount: { $sum: "$_spBalance" },
            },
          },
        ],
        taxCollected: [
          { $match: { _spFullyPaid: true, _spTax: { $gt: 0.005 } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              amount: { $sum: "$_spTax" },
            },
          },
        ],
        taxToCollect: [
          { $match: { _spFullyPaid: false, _spTax: { $gt: 0.005 } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              amount: { $sum: "$_spTax" },
            },
          },
        ],
      },
    },
  ]);
  const facet = rows?.[0] || {};
  const pick = (key) => {
    const row = facet?.[key]?.[0] || {};
    return {
      count: Number(row.count) || 0,
      amount: round2(row.amount),
    };
  };
  return {
    amountReceivable: pick("amountReceivable"),
    taxCollected: pick("taxCollected"),
    taxToCollect: pick("taxToCollect"),
  };
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
      searchParams.has("page") ||
      searchParams.has("pageSize") ||
      searchParams.has("q") ||
      searchParams.has("sortBy") ||
      searchParams.has("listKind") ||
      searchParams.has("from") ||
      searchParams.has("to") ||
      searchParams.has("status");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const listKind = String(searchParams.get("listKind") || "").trim().toLowerCase();
    const statusFilter = String(searchParams.get("status") || "").trim();
    const from = String(searchParams.get("from") || "").trim().slice(0, 10);
    const to = String(searchParams.get("to") || "").trim().slice(0, 10);
    const sortBy = String(searchParams.get("sortBy") || "updatedAt").trim();
    const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortMul = sortDir === "asc" ? 1 : -1;

    const mergedSettings = await loadMergedSettingsForEmail(email);
    const isInvoices = listKind === "invoices" || listKind === "invoice";

    const kindClause =
      listKind === "invoices" || listKind === "invoice"
        ? mongoInvoiceKindClause(mergedSettings)
        : listKind === "proposals" || listKind === "proposal"
          ? mongoProposalKindClause(mergedSettings)
          : null;
    const dateClause = mongoSpDateRangeClause(from, to);
    const statusClause = mongoStatusFilterClause(statusFilter, mergedSettings, { isInvoices });

    let searchClause = null;
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      searchClause = {
        $or: [
          { documentNumber: rx },
          { quote: rx },
          { companyName: rx },
          { status: rx },
          { jobStatus: rx },
          { customerId: rx },
          { customerPhone: rx },
          { customerEmail: rx },
          { phone: rx },
          { email: rx },
          { quotedBy: rx },
          { quoteType: rx },
          { internalNotes: rx },
          { notes: rx },
        ],
      };
    }

    const baseMatch = andMongoClauses({ createdByEmail: email }, kindClause, dateClause);
    const listMatch = andMongoClauses(baseMatch, statusClause, searchClause);

    const sortField = simpleSpSortField(sortBy);
    const useStatusRank = sortBy === "status" && !isInvoices;

    const summaryPromise = SimpleServiceProposal.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: { $toLower: { $ifNull: ["$status", ""] } },
          count: { $sum: 1 },
          amount: { $sum: { $convert: { input: "$total", to: "double", onError: 0, onNull: 0 } } },
          taxCollected: {
            $sum: { $convert: { input: "$taxCollected", to: "double", onError: 0, onNull: 0 } },
          },
        },
      },
    ]);

    const totalsPromise = SimpleServiceProposal.aggregate([
      { $match: listMatch },
      {
        $group: {
          _id: null,
          total: { $sum: { $convert: { input: "$total", to: "double", onError: 0, onNull: 0 } } },
          taxCollected: {
            $sum: { $convert: { input: "$taxCollected", to: "double", onError: 0, onNull: 0 } },
          },
          logisticCharges: { $sum: LOGISTIC_CHARGES_TOTAL_EXPR },
          count: { $sum: 1 },
        },
      },
    ]);

    const invoiceFinancePromise = isInvoices
      ? loadInvoiceFinanceSummary(baseMatch)
      : Promise.resolve(emptyInvoiceFinance());

    let items = [];
    let totalCount = 0;

    if (useStatusRank) {
      const [agg, summaryRows, totalsRows, invoiceFinance] = await Promise.all([
        SimpleServiceProposal.aggregate([
          { $match: listMatch },
          { $addFields: { __statusRank: statusSortRankExpression(mergedSettings) } },
          { $sort: { __statusRank: sortMul, updatedAt: -1 } },
          {
            $facet: {
              total: [{ $count: "n" }],
              page: [{ $skip: skip }, { $limit: pageSize }],
            },
          },
        ]),
        summaryPromise,
        totalsPromise,
        invoiceFinancePromise,
      ]);
      totalCount = Number(agg?.[0]?.total?.[0]?.n) || 0;
      items = (agg?.[0]?.page || []).map((doc) => serializeSimplePortalDoc(doc));
      if (!includePagination) return NextResponse.json(items);
      const totalsRow = totalsRows?.[0] || {};
      return NextResponse.json({
        items,
        page,
        pageSize,
        totalCount,
        totals: {
          total: Number(totalsRow.total) || 0,
          taxCollected: Number(totalsRow.taxCollected) || 0,
          logisticCharges: Number(totalsRow.logisticCharges) || 0,
          count: Number(totalsRow.count) || totalCount,
        },
        statusBuckets: (summaryRows || []).map((r) => ({
          status: String(r._id || ""),
          count: Number(r.count) || 0,
          amount: Number(r.amount) || 0,
          taxCollected: Number(r.taxCollected) || 0,
        })),
        invoiceFinance,
      });
    }

    const sort = { [sortField]: sortMul, updatedAt: -1 };
    const [count, list, summaryRows, totalsRows, invoiceFinance] = await Promise.all([
      SimpleServiceProposal.countDocuments(listMatch),
      SimpleServiceProposal.find(listMatch).sort(sort).skip(skip).limit(pageSize).lean(),
      summaryPromise,
      totalsPromise,
      invoiceFinancePromise,
    ]);
    totalCount = count;
    items = list.map((doc) => serializeSimplePortalDoc(doc));
    if (!includePagination) return NextResponse.json(items);
    const totalsRow = totalsRows?.[0] || {};
    return NextResponse.json({
      items,
      page,
      pageSize,
      totalCount,
      totals: {
        total: Number(totalsRow.total) || 0,
        taxCollected: Number(totalsRow.taxCollected) || 0,
        logisticCharges: Number(totalsRow.logisticCharges) || 0,
        count: Number(totalsRow.count) || totalCount,
      },
      statusBuckets: (summaryRows || []).map((r) => ({
        status: String(r._id || ""),
        count: Number(r.count) || 0,
        amount: Number(r.amount) || 0,
        taxCollected: Number(r.taxCollected) || 0,
      })),
      invoiceFinance,
    });
  } catch (err) {
    console.error("Dashboard list simple service proposals error:", err);
    return NextResponse.json({ error: "Failed to list service proposals" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const payload = sanitizeSimplePortalPayload(body);
    const mergedSettings = await loadMergedSettingsForEmail(email);
    const requestedNumber = String(payload.documentNumber || payload.quote || "").trim();
    if (requestedNumber) {
      try {
        await assertSimplePortalJobNumberAvailable(email, requestedNumber);
      } catch (numErr) {
        if (numErr?.code === "DUPLICATE_JOB_NUMBER") {
          return NextResponse.json({ error: numErr.message }, { status: 409 });
        }
        throw numErr;
      }
    }

    const doc = await createSimpleServiceProposalWithUniqueJobNumber(
      {
        ...payload,
        createdByEmail: email,
        customerId: String(payload.customerId || "").trim(),
        recordType: String(payload.recordType || "RFQ").trim().toUpperCase() || "RFQ",
        status: String(payload.status || "").trim(),
        jobStatus: String(payload.jobStatus || "").trim(),
        dateCreated: payload.dateCreated ?? null,
        date: payload.date ?? payload.dateCreated ?? null,
        companyName: String(payload.companyName || "").trim(),
      },
      email,
      mergedSettings
    );
    const item = serializeSimplePortalDoc(doc);
    try {
      await applySimpleServiceProposalInventoryLifecycle(email, item.id, null, doc);
    } catch (invErr) {
      console.error("Simple SP inventory lifecycle on create:", invErr);
      return NextResponse.json(
        {
          error: invErr.message || "Created, but inventory reserve/consume failed",
          item,
        },
        { status: 500 }
      );
    }
    void emitCrmResourceEvent({
      ownerEmail: email,
      collection: "serviceProposals",
      action: "created",
      resourceId: item.id,
      data: item,
    });
    void notifySimpleJobBoardFromSp(email, null, doc);
    enqueueQuickBooksSync({
      ownerEmail: email,
      trigger: "serviceProposal",
      previous: null,
      next: typeof doc.toObject === "function" ? doc.toObject() : doc,
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    console.error("Dashboard create simple service proposal error:", err);
    return NextResponse.json({ error: err.message || "Failed to create service proposal" }, { status: 500 });
  }
}
