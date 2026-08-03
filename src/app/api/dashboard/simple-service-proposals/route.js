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
    const recordType = String(searchParams.get("recordType") || "").trim().toUpperCase();

    const q = { createdByEmail: email };
    if (recordType) q.recordType = recordType;
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [
        { documentNumber: rx },
        { companyName: rx },
        { status: rx },
        { jobStatus: rx },
        { customerId: rx },
      ];
    }

    const [totalCount, list] = await Promise.all([
      SimpleServiceProposal.countDocuments(q),
      SimpleServiceProposal.find(q).sort({ updatedAt: -1 }).skip(skip).limit(pageSize).lean(),
    ]);
    const items = list.map((doc) => serializeSimplePortalDoc(doc));
    if (!includePagination) return NextResponse.json(items);
    return NextResponse.json({ items, page, pageSize, totalCount });
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
    const doc = await SimpleServiceProposal.create({
      ...payload,
      createdByEmail: email,
      customerId: String(payload.customerId || "").trim(),
      documentNumber: String(payload.documentNumber || payload.quote || "").trim(),
      recordType: String(payload.recordType || "RFQ").trim().toUpperCase() || "RFQ",
      status: String(payload.status || "").trim(),
      jobStatus: String(payload.jobStatus || "").trim(),
      dateCreated: String(payload.dateCreated || payload.date || "").trim(),
      companyName: String(payload.companyName || "").trim(),
    });
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
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    console.error("Dashboard create simple service proposal error:", err);
    return NextResponse.json({ error: err.message || "Failed to create service proposal" }, { status: 500 });
  }
}
