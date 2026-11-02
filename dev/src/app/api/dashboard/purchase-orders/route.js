import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import { normalizePurchaseOrderLineItems } from "@/lib/purchase-order-line-items";
import { resolvePoNumber } from "@/lib/purchase-order-numbers";
import { normalizePurchaseOrderAttachmentsFromClient } from "@/lib/dashboard-entity-attachments";
import { sumPoLineItemsTaxInclusive } from "@/lib/po-line-item-totals";
import { poGrandTotal, sumPoOtherCharges } from "@/lib/po-payable";
import {
  computePoDeliveryStatus,
  computePoInvoicedStatus,
  computePoOverallStatus,
  computePoPaidStatus,
} from "@/lib/po-status";

const MAX_INVOICES = 50;
const MAX_PAYMENTS = 50;

function normalizeVendorInvoices(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_INVOICES).map((row) => ({
    invoiceNumber: clampString(row?.invoiceNumber, 100),
    date: clampString(row?.date, 50),
    amount: clampString(row?.amount, 50),
    attachmentUrl: clampString(row?.attachmentUrl, LIMITS.url.max),
    attachmentName: clampString(row?.attachmentName, 200),
  }));
}

function normalizePayments(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_PAYMENTS).map((row) => ({
    amount: clampString(row?.amount, 50),
    date: clampString(row?.date, 50),
    method: clampString(row?.method, 100),
    reference: clampString(row?.reference, 200),
  }));
}

function sumLineItems(lines) {
  return sumPoLineItemsTaxInclusive(lines);
}

function sumAmounts(items, key = "amount") {
  let sum = 0;
  for (const row of items) {
    const a = parseFloat(row?.[key]);
    if (Number.isFinite(a)) sum += a;
  }
  return sum;
}

function toPoListItem(
  po,
  vendorNameMap = {},
  quoteRfqMap = {},
  jobNumberMap = {},
  jobCustomerName = "—",
  customerId = ""
) {
  const lineItems = Array.isArray(po.lineItems) ? po.lineItems : [];
  const vendorInvoices = Array.isArray(po.vendorInvoices) ? po.vendorInvoices : [];
  const payments = Array.isArray(po.payments) ? po.payments : [];
  const lineTotal = sumLineItems(lineItems);
  const otherChargesTotal = sumPoOtherCharges(po);
  const totalOrder = poGrandTotal(po);
  const totalInvoiced = sumAmounts(vendorInvoices);
  const totalPaid = sumAmounts(payments);
  const status = computePoOverallStatus(totalOrder, totalInvoiced, totalPaid);
  const invoicedStatus = computePoInvoicedStatus(totalOrder, totalInvoiced);
  const paidStatus = computePoPaidStatus(totalInvoiced, totalPaid, totalOrder);
  const lineItemsWithStatus = lineItems.map((item) => ({
    ...item,
    status:
      item?.status === "Received"
        ? "Received"
        : item?.status === "Back Order"
          ? "Back Order"
          : item?.status === "Delivered" || item?.status === "Dispatch"
            ? "Dispatch"
            : "Ordered",
  }));
  const deliveryStatus = computePoDeliveryStatus(lineItemsWithStatus);
  const qrf = po.quoteId ? (quoteRfqMap[String(po.quoteId)] ?? "") : "";
  const jn = po.repairFlowJobId ? (jobNumberMap[String(po.repairFlowJobId)] ?? "") : "";
  const linkLabel = jn || qrf || "—";
  const typeNorm = (po.type ?? "shop") === "job" ? "job" : "shop";
  return {
    id: po._id.toString(),
    poNumber: po.poNumber ?? "",
    vendorId: po.vendorId ?? "",
    type: typeNorm,
    quoteId: po.quoteId ?? "",
    repairFlowJobId: po.repairFlowJobId ?? "",
    vendorName: vendorNameMap[po.vendorId] ?? po.vendorId ?? "—",
    rfqNumber: linkLabel,
    customerName: typeNorm === "job" ? jobCustomerName : "—",
    customerId: typeNorm === "job" ? customerId : "",
    lineItems: lineItemsWithStatus,
    vendorInvoices,
    payments,
    lineItemsTotal: lineTotal.toFixed(2),
    totalOrder: lineTotal.toFixed(2),
    otherChargesTotal: otherChargesTotal.toFixed(2),
    grandTotal: totalOrder.toFixed(2),
    otherCharges: (Array.isArray(po.otherCharges) ? po.otherCharges : []).map((row) => ({
      label: row?.label || "Logistics charges",
      amount: row?.amount || "",
      logisticsEntryId: row?.logisticsEntryId ? String(row.logisticsEntryId) : "",
    })),
    totalInvoiced: totalInvoiced.toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    status,
    deliveryStatus,
    invoicedStatus,
    paidStatus,
    notes: po.notes ?? "",
    vendorShareToken: po.vendorShareToken ?? "",
    attachmentCount: Array.isArray(po.attachments) ? po.attachments.length : 0,
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
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
      searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("q");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const typeFilter = String(searchParams.get("type") || "").trim().toLowerCase();
    const sortBy = String(searchParams.get("sortBy") || "createdAt").trim();
    const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      poNumber: "poNumber",
      vendor: "vendorId",
      type: "type",
      rfqNumber: "quoteId",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const q = { createdByEmail: email };
    if (typeFilter === "shop" || typeFilter === "job") {
      q.type = typeFilter;
    }
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const orParts = [
        { poNumber: rx },
        { status: rx },
        { quoteId: rx },
        { deliveryStatus: rx },
        { invoicedStatus: rx },
        { paidStatus: rx },
      ];
      const CustomerSearch = (await import("@/models/Customer")).default;
      const QuoteSearch = (await import("@/models/Quote")).default;
      const MotorRepairJobSearch = (await import("@/models/MotorRepairJob")).default;
      const custMatch = await CustomerSearch.find({
        createdByEmail: email,
        $or: [{ companyName: rx }, { primaryContactName: rx }],
      })
        .select("_id")
        .lean();
      const custIds = custMatch.map((c) => c._id);
      if (custIds.length > 0) {
        const [quotesByCust, jobsByCust] = await Promise.all([
          QuoteSearch.find({ createdByEmail: email, customerId: { $in: custIds } }).select("_id").lean(),
          MotorRepairJobSearch.find({ createdByEmail: email, customerId: { $in: custIds } }).select("_id").lean(),
        ]);
        for (const qq of quotesByCust) orParts.push({ quoteId: qq._id.toString() });
        for (const jj of jobsByCust) orParts.push({ repairFlowJobId: jj._id.toString() });
      }
      q.$or = orParts;
    }
    const ownerScope = { createdByEmail: email };
    const [totalCount, list, summaryDocs] = await Promise.all([
      PurchaseOrder.countDocuments(q),
      PurchaseOrder.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
      PurchaseOrder.find(ownerScope).select("type lineItems").lean(),
    ]);

    const summaryByType = {
      all: { count: 0, amount: 0 },
      shop: { count: 0, amount: 0 },
      job: { count: 0, amount: 0 },
    };
    for (const po of summaryDocs) {
      const typeKey = (po.type ?? "shop") === "job" ? "job" : "shop";
      const amount = sumLineItems(po.lineItems ?? []);
      summaryByType[typeKey].count += 1;
      summaryByType[typeKey].amount += amount;
      summaryByType.all.count += 1;
      summaryByType.all.amount += amount;
    }

    const Vendor = (await import("@/models/Vendor")).default;
    const Quote = (await import("@/models/Quote")).default;
    const Customer = (await import("@/models/Customer")).default;
    const vendors = await Vendor.find({ createdByEmail: email }).select("_id name").lean();
    const quotes = await Quote.find({ createdByEmail: email }).select("_id rfqNumber customerId").lean();
    const vendorNameMap = {};
    const quoteRfqMap = {};
    const quoteCustomerIdMap = {};
    for (const v of vendors) vendorNameMap[v._id.toString()] = v.name ?? "";
    for (const q of quotes) {
      const id = q._id.toString();
      quoteRfqMap[id] = q.rfqNumber ?? "";
      quoteCustomerIdMap[id] = String(q.customerId ?? "").trim();
    }

    const jobIds = [...new Set(list.map((p) => String(p.repairFlowJobId || "").trim()).filter(Boolean))];
    const MotorRepairJob = (await import("@/models/MotorRepairJob")).default;
    const jobsLean =
      jobIds.length > 0
        ? await MotorRepairJob.find({ _id: { $in: jobIds }, createdByEmail: email })
            .select("_id jobNumber customerId")
            .lean()
        : [];
    const jobNumberMap = {};
    const jobCustomerIdMap = {};
    for (const j of jobsLean) {
      const id = j._id.toString();
      jobNumberMap[id] = j.jobNumber ?? "";
      jobCustomerIdMap[id] = String(j.customerId ?? "").trim();
    }

    const customerIdSet = new Set();
    for (const j of jobsLean) {
      const cid = jobCustomerIdMap[j._id.toString()];
      if (cid && /^[a-f0-9]{24}$/i.test(cid)) customerIdSet.add(cid);
    }
    for (const po of list) {
      const qid = String(po.quoteId || "").trim();
      if (qid) {
        const cid = quoteCustomerIdMap[qid];
        if (cid && /^[a-f0-9]{24}$/i.test(cid)) customerIdSet.add(cid);
      }
    }
    const customerIds = [...customerIdSet];
    const customers =
      customerIds.length > 0
        ? await Customer.find({ _id: { $in: customerIds }, createdByEmail: email })
            .select("_id companyName primaryContactName")
            .lean()
        : [];
    const customerNameMap = {};
    for (const c of customers) {
      customerNameMap[c._id.toString()] =
        String(c.companyName || "").trim() || String(c.primaryContactName || "").trim() || "—";
    }

    function resolveJobPoCustomerId(po) {
      if ((po.type ?? "shop") !== "job") return "";
      const jid = String(po.repairFlowJobId || "").trim();
      if (jid) {
        const cid = jobCustomerIdMap[jid];
        if (cid) return cid;
      }
      const qid = String(po.quoteId || "").trim();
      if (qid) {
        const cid = quoteCustomerIdMap[qid];
        if (cid) return cid;
      }
      return "";
    }

    function resolveJobPoCustomerName(po) {
      const cid = resolveJobPoCustomerId(po);
      if (cid && customerNameMap[cid]) return customerNameMap[cid];
      return "—";
    }

    const listWithId = list.map((po) =>
      toPoListItem(
        { ...po, _id: po._id },
        vendorNameMap,
        quoteRfqMap,
        jobNumberMap,
        resolveJobPoCustomerName(po),
        resolveJobPoCustomerId(po)
      )
    );
    if (!includePagination) return NextResponse.json(listWithId);
    return NextResponse.json({ items: listWithId, page, pageSize, totalCount, summaryByType });
  } catch (err) {
    console.error("Dashboard list purchase orders error:", err);
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
    const body = await request.json();
    const {
      vendorId,
      type,
      quoteId,
      repairFlowJobId: bodyRepairFlowJobId,
      lineItems,
      vendorInvoices,
      payments,
      notes,
      attachments,
    } = body;
    if (!vendorId?.trim()) {
      return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();
    const typeVal = type === "job" ? "job" : "shop";
    let qId = typeVal === "job" ? clampString(quoteId, 100) : "";
    let rjId = typeVal === "job" ? clampString(bodyRepairFlowJobId, 100) : "";
    const poNumber = await resolvePoNumber(email, {
      type: typeVal,
      quoteId: qId,
      repairFlowJobId: rjId,
    });
    if (typeVal === "job" && rjId) {
      const MotorRepairJob = (await import("@/models/MotorRepairJob")).default;
      const job = await MotorRepairJob.findOne({ _id: rjId, createdByEmail: email }).select("_id").lean();
      if (!job) {
        return NextResponse.json({ error: "Repair job not found" }, { status: 400 });
      }
    }
    const doc = await PurchaseOrder.create({
      poNumber,
      vendorId: vendorId.trim(),
      type: typeVal,
      quoteId: qId,
      repairFlowJobId: rjId,
      lineItems: normalizePurchaseOrderLineItems(lineItems),
      vendorInvoices: normalizeVendorInvoices(vendorInvoices ?? []),
      payments: normalizePayments(payments ?? []),
      notes: clampString(notes, LIMITS.message.max),
      attachments: normalizePurchaseOrderAttachmentsFromClient(attachments ?? []),
      createdByEmail: email,
    });
    const po = doc.toObject();
    const totalOrder = sumLineItems(po.lineItems ?? []);
    const totalInvoiced = sumAmounts(po.vendorInvoices ?? []);
    const totalPaid = sumAmounts(po.payments ?? []);
    return NextResponse.json({
      ok: true,
      purchaseOrder: {
        id: doc._id.toString(),
        poNumber: po.poNumber ?? "",
        vendorId: po.vendorId,
        type: po.type,
        quoteId: po.quoteId ?? "",
        repairFlowJobId: po.repairFlowJobId ?? "",
        lineItems: (po.lineItems ?? []).map((item) => ({ ...item, status: (item?.status === "Delivered" || item?.status === "Dispatch") ? "Dispatch" : "Ordered" })),
        vendorInvoices: po.vendorInvoices ?? [],
        payments: po.payments ?? [],
        totalOrder: totalOrder.toFixed(2),
        totalInvoiced: totalInvoiced.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        status: computePoOverallStatus(totalOrder, totalInvoiced, totalPaid),
        notes: po.notes ?? "",
        vendorShareToken: po.vendorShareToken ?? "",
        attachments: Array.isArray(po.attachments)
          ? po.attachments.map((a) => ({ url: a?.url ?? "", name: a?.name ?? "" }))
          : [],
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error("Dashboard create purchase order error:", err);
    return NextResponse.json({ error: err.message || "Failed to create purchase order" }, { status: 500 });
  }
}
