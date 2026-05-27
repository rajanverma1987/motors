import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import Quote from "@/models/Quote";
import Motor from "@/models/Motor";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { createWorkOrderForQuote } from "@/lib/work-order-factory";
import UserSettings from "@/models/UserSettings";

/** Work orders list: "Closed" bucket = status label Close (exact, case-insensitive). */
const WORK_ORDER_CLOSE_STATUS_RX = /^close$/i;

function workOrderCloseStatusQuery() {
  return { status: { $regex: WORK_ORDER_CLOSE_STATUS_RX } };
}

/** Open bucket = everything except Close status. */
function workOrderOpenBucketQuery() {
  return { status: { $not: { $regex: WORK_ORDER_CLOSE_STATUS_RX } } };
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
    const bucket = String(searchParams.get("bucket") || "open").trim().toLowerCase();
    const includePagination =
      searchParams.has("page") ||
      searchParams.has("pageSize") ||
      searchParams.has("q") ||
      searchParams.has("bucket");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const sortBy = String(searchParams.get("sortBy") || "createdAt").trim();
    const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      workOrderNumber: "workOrderNumber",
      quoteRfqNumber: "quoteRfqNumber",
      status: "status",
      date: "date",
      customerCompany: "companyName",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const ownerScope = { createdByEmail: email };
    const q = { ...ownerScope };
    const and = [];
    if (bucket === "closed") {
      and.push(workOrderCloseStatusQuery());
    } else {
      and.push(workOrderOpenBucketQuery());
    }
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      and.push({
        $or: [{ workOrderNumber: rx }, { quoteRfqNumber: rx }, { status: rx }, { companyName: rx }],
      });
    }
    if (and.length === 1) {
      Object.assign(q, and[0]);
    } else if (and.length > 1) {
      q.$and = and;
    }

    const findSorted = () => WorkOrder.find(q).sort(sort);
    const openScope = { ...ownerScope, ...workOrderOpenBucketQuery() };
    const closeScope = { ...ownerScope, ...workOrderCloseStatusQuery() };
    const [totalCount, list, openCount, closedCount] = await Promise.all([
      includePagination ? WorkOrder.countDocuments(q) : Promise.resolve(0),
      includePagination
        ? findSorted().skip(skip).limit(pageSize).lean()
        : findSorted().lean(),
      WorkOrder.countDocuments(openScope),
      WorkOrder.countDocuments(closeScope),
    ]);
    const summaryBuckets = {
      open: Number(openCount) || 0,
      closed: Number(closedCount) || 0,
    };
    const customerIds = [...new Set(list.map((w) => w.customerId).filter(Boolean))];
    const customers = await Customer.find({
      _id: { $in: customerIds },
      createdByEmail: email,
    })
      .lean()
      .catch(() => []);
    const custMap = Object.fromEntries(
      (customers || []).map((c) => [c._id.toString(), c.companyName || c.primaryContactName || ""])
    );
    const items = list.map((w) => ({
        ...w,
        id: w._id.toString(),
        _id: undefined,
        customerCompany: custMap[w.customerId] || "",
      }));
    if (!includePagination) return NextResponse.json(items);
    return NextResponse.json({ items, page, pageSize, totalCount, summaryBuckets });
  } catch (err) {
    console.error("List work orders:", err);
    return NextResponse.json({ error: "Failed to list work orders" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const quoteId = String(body.quoteId || "").trim();
    if (!quoteId) {
      return NextResponse.json({ error: "quoteId required" }, { status: 400 });
    }
    await connectDB();
    const quote = await Quote.findOne({ _id: quoteId, createdByEmail: email }).lean();
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }
    const motor = await Motor.findOne({
      _id: quote.motorId,
      createdByEmail: email,
    }).lean();
    if (!motor) {
      return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    }
    const customer = await Customer.findOne({
      _id: quote.customerId,
      createdByEmail: email,
    }).lean();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();

    const result = await createWorkOrderForQuote({
      email,
      quote,
      motor,
      customer,
      settingsDoc,
      options: {
        technicianEmployeeId:
          String(body.technicianEmployeeId || "").trim() ||
          String(quote.technicianEmployeeId || "").trim(),
        jobType: body.jobType,
      },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus || 400 });
    }
    return NextResponse.json({
      ok: true,
      workOrder: result.workOrder,
    });
  } catch (err) {
    console.error("Create work order:", err);
    if (err.code === 11000) {
      return NextResponse.json({ error: "Work order number conflict; try again." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || "Failed to create" }, { status: 500 });
  }
}
