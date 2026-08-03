import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  sanitizeSimplePortalPayload,
  serializeSimplePortalDoc,
} from "@/lib/simple-portal-mongo";
import { emitCrmResourceEvent } from "@/lib/integration-webhooks";

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
      searchParams.has("serviceProposalId") ||
      searchParams.has("jobNumber");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const serviceProposalId = String(searchParams.get("serviceProposalId") || "").trim();
    const jobNumber = String(searchParams.get("jobNumber") || "").trim();

    const q = { createdByEmail: email };
    if (serviceProposalId || jobNumber) {
      const ors = [];
      if (serviceProposalId) ors.push({ serviceProposalId });
      if (jobNumber) ors.push({ jobNumber });
      q.$or = ors;
    }
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const textOr = [
        { poNumber: rx },
        { jobNumber: rx },
        { vendorName: rx },
        { paymentStatus: rx },
      ];
      if (q.$or) {
        q.$and = [{ $or: q.$or }, { $or: textOr }];
        delete q.$or;
      } else {
        q.$or = textOr;
      }
    }

    const [totalCount, list] = await Promise.all([
      SimplePurchaseOrder.countDocuments(q),
      SimplePurchaseOrder.find(q).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
    ]);
    const items = list.map((doc) => serializeSimplePortalDoc(doc));
    if (!includePagination) return NextResponse.json(items);
    return NextResponse.json({ items, page, pageSize, totalCount });
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
      poCutDate: String(payload.poCutDate || "").trim(),
      dueDate: String(payload.dueDate || "").trim(),
    });
    const item = serializeSimplePortalDoc(doc);
    void emitCrmResourceEvent({
      ownerEmail: email,
      collection: "purchaseOrders",
      action: "created",
      resourceId: item.id,
      data: item,
    });
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    console.error("Dashboard create simple purchase order error:", err);
    return NextResponse.json({ error: err.message || "Failed to create purchase order" }, { status: 500 });
  }
}
