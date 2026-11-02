import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { issueInventoryToJob, issueInventoryToShop } from "@/lib/inventory-service";
import { clampString } from "@/lib/validation";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function toRow(doc) {
  const onHand = Number(doc.onHand) || 0;
  const reserved = Number(doc.reserved) || 0;
  return {
    id: doc._id.toString(),
    name: doc.name ?? "",
    sku: doc.sku ?? "",
    onHand,
    reserved,
    available: onHand - reserved,
    threshold: Number(doc.threshold) || 0,
    location: doc.location ?? "",
    uom: doc.uom ?? "ea",
    notes: doc.notes ?? "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * POST — issue stock to a Simple job or to shop use.
 * Body: { target: "job"|"shop", qty, simpleServiceProposalId?, reason?, notes? }
 */
export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const exists = await InventoryItem.findOne({ _id: id, createdByEmail: email }).select("_id").lean();
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const target = String(body.target || body.mode || "").trim().toLowerCase();
    const qty = Number(body.qty);
    const notes = clampString(body.notes, 500);
    const reason = clampString(body.reason, 200);

    if (target === "shop") {
      const result = await issueInventoryToShop(email, id, { qty, reason, notes });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "Issue failed" }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        item: toRow(result.item),
        movementId: result.movement?._id?.toString?.() || "",
      });
    }

    if (target === "job") {
      const sid = String(body.simpleServiceProposalId || body.jobId || "").trim();
      if (!sid || !mongoose.Types.ObjectId.isValid(sid)) {
        return NextResponse.json({ error: "Job is required" }, { status: 400 });
      }
      const job = await SimpleServiceProposal.findOne({ _id: sid, createdByEmail: email })
        .select("documentNumber recordType")
        .lean();
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      const result = await issueInventoryToJob(email, id, {
        qty,
        simpleServiceProposalId: sid,
        documentNumber: String(job.documentNumber || "").trim(),
        notes,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error || "Issue failed" }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        item: toRow(result.item),
        movementId: result.movement?._id?.toString?.() || "",
      });
    }

    return NextResponse.json({ error: "target must be job or shop" }, { status: 400 });
  } catch (err) {
    console.error("Inventory issue POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
