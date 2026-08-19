import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  sanitizeSimplePortalPayload,
  serializeSimplePortalDoc,
} from "@/lib/simple-portal-mongo";
import { mongoCalendarDateRange } from "@/lib/format-date";
import { emitCrmResourceEvent } from "@/lib/integration-webhooks";
import { enqueueQuickBooksSync } from "@/lib/quickbooks/triggers";

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
      searchParams.has("from") ||
      searchParams.has("to") ||
      searchParams.has("paymentStatus") ||
      searchParams.has("serviceProposalId") ||
      searchParams.has("jobNumber");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const serviceProposalId = String(searchParams.get("serviceProposalId") || "").trim();
    const jobNumber = String(searchParams.get("jobNumber") || "").trim();
    const paymentStatus = String(searchParams.get("paymentStatus") || "").trim();
    const from = String(searchParams.get("from") || "").trim().slice(0, 10);
    const to = String(searchParams.get("to") || "").trim().slice(0, 10);
    const sortBy = String(searchParams.get("sortBy") || "updatedAt").trim();
    const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      poNumber: "poNumber",
      jobNumber: "jobNumber",
      vendorName: "vendorName",
      poType: "poType",
      paymentStatus: "paymentStatus",
      poCutDate: "poCutDate",
      dueDate: "dueDate",
      poInvoiceReceiveDate: "poInvoiceReceiveDate",
      poItemReceiveDate: "poItemReceiveDate",
      poPaidDate: "poPaidDate",
      total: "total",
      updatedAt: "updatedAt",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "updatedAt";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, updatedAt: -1 };

    const q = { createdByEmail: email };
    const andParts = [];
    if (serviceProposalId || jobNumber) {
      const ors = [];
      if (serviceProposalId) ors.push({ serviceProposalId });
      if (jobNumber) ors.push({ jobNumber });
      andParts.push({ $or: ors });
    }
    if (paymentStatus) {
      const escaped = paymentStatus.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andParts.push({
        paymentStatus: { $regex: `^${escaped}$`, $options: "i" },
      });
    }
    if (from || to) {
      const range = mongoCalendarDateRange(from, to);
      if (range) {
        andParts.push({
          $or: [{ poCutDate: range }, { dueDate: range }, { date: range }],
        });
      }
    }
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      andParts.push({
        $or: [
          { poNumber: rx },
          { jobNumber: rx },
          { vendorName: rx },
          { paymentStatus: rx },
        ],
      });
    }
    if (andParts.length === 1) Object.assign(q, andParts[0]);
    else if (andParts.length > 1) q.$and = andParts;

    const baseForCards = { createdByEmail: email };
    const cardAnd = [];
    if (from || to) {
      const range = mongoCalendarDateRange(from, to);
      if (range) {
        cardAnd.push({
          $or: [{ poCutDate: range }, { dueDate: range }, { date: range }],
        });
      }
    }
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      cardAnd.push({
        $or: [{ poNumber: rx }, { jobNumber: rx }, { vendorName: rx }, { paymentStatus: rx }],
      });
    }
    if (cardAnd.length === 1) Object.assign(baseForCards, cardAnd[0]);
    else if (cardAnd.length > 1) baseForCards.$and = cardAnd;

    const [totalCount, list, paymentBuckets] = await Promise.all([
      SimplePurchaseOrder.countDocuments(q),
      SimplePurchaseOrder.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
      SimplePurchaseOrder.aggregate([
        { $match: baseForCards },
        {
          $group: {
            _id: { $ifNull: ["$paymentStatus", "Unpaid"] },
            count: { $sum: 1 },
            amount: {
              $sum: { $convert: { input: "$grandTotal", to: "double", onError: 0, onNull: 0 } },
            },
          },
        },
      ]),
    ]);
    const items = list.map((doc) => serializeSimplePortalDoc(doc));
    if (!includePagination) return NextResponse.json(items);
    return NextResponse.json({
      items,
      page,
      pageSize,
      totalCount,
      paymentBuckets: (paymentBuckets || []).map((r) => ({
        paymentStatus: String(r._id || "Unpaid"),
        count: Number(r.count) || 0,
        amount: Number(r.amount) || 0,
      })),
    });
  } catch (err) {
    console.error("Dashboard list simple purchase orders error:", err);
    return NextResponse.json({ error: "Failed to list purchase orders" }, { status: 500 });
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
    const doc = await SimplePurchaseOrder.create({
      ...payload,
      createdByEmail: email,
      poType: String(payload.poType || "job").trim().toLowerCase() || "job",
      serviceProposalId: String(payload.serviceProposalId || "").trim(),
      jobNumber: String(payload.jobNumber || "").trim(),
      poNumber: String(payload.poNumber || "").trim(),
      vendorId: String(payload.vendorId || "").trim(),
      vendorName: String(payload.vendorName || "").trim(),
      paymentStatus: String(payload.paymentStatus || "Unpaid").trim() || "Unpaid",
      poCutDate: payload.poCutDate ?? null,
      dueDate: payload.dueDate ?? null,
    });
    const item = serializeSimplePortalDoc(doc);
    void emitCrmResourceEvent({
      ownerEmail: email,
      collection: "purchaseOrders",
      action: "created",
      resourceId: item.id,
      data: item,
    });
    enqueueQuickBooksSync({
      ownerEmail: email,
      trigger: "purchaseOrder",
      previous: null,
      next: typeof doc.toObject === "function" ? doc.toObject() : doc,
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    console.error("Dashboard create simple purchase order error:", err);
    return NextResponse.json({ error: err.message || "Failed to create purchase order" }, { status: 500 });
  }
}
