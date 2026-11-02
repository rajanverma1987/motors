import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import InventoryMovement from "@/models/InventoryMovement";
import InventoryReservation from "@/models/InventoryReservation";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function movementTypeLabel(type) {
  switch (String(type || "")) {
    case "receive_po":
      return "Receive (PO)";
    case "issue_job":
      return "Issue to job";
    case "issue_shop":
      return "Issue to shop";
    case "return_stock":
      return "Return to stock";
    case "adjust":
      return "Adjust";
    case "reserve":
      return "Reserve";
    case "release":
      return "Release";
    case "consume":
      return "Consume";
    default:
      return String(type || "Movement");
  }
}

function movementTypeVariant(type) {
  switch (String(type || "")) {
    case "receive_po":
    case "return_stock":
      return "success";
    case "issue_job":
    case "issue_shop":
    case "consume":
      return "danger";
    case "adjust":
      return "warning";
    case "reserve":
      return "primary";
    case "release":
      return "default";
    default:
      return "default";
  }
}

/**
 * GET — full movement ledger for one inventory item (+ active reservations summary).
 * Query: type=receive_po to filter purchase history only.
 */
export async function GET(request, context) {
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

    const item = await InventoryItem.findOne({ _id: id, createdByEmail: email })
      .select("name sku uom onHand reserved")
      .lean();
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = String(searchParams.get("type") || "").trim();
    const q = {
      createdByEmail: email,
      inventoryItemId: id,
    };
    if (typeFilter) q.type = typeFilter;

    const [movements, reservations] = await Promise.all([
      InventoryMovement.find(q).sort({ createdAt: -1 }).limit(500).lean(),
      InventoryReservation.find({
        createdByEmail: email,
        inventoryItemId: id,
      })
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const simpleIds = new Set();
    for (const m of movements) {
      const sid = String(m.simpleServiceProposalId || "").trim();
      if (sid && mongoose.Types.ObjectId.isValid(sid)) simpleIds.add(sid);
    }
    for (const r of reservations) {
      const sid = String(r.simpleServiceProposalId || "").trim();
      if (sid && mongoose.Types.ObjectId.isValid(sid)) simpleIds.add(sid);
    }

    const simples = simpleIds.size
      ? await SimpleServiceProposal.find({
          _id: { $in: [...simpleIds] },
          createdByEmail: email,
        })
          .select("documentNumber recordType")
          .lean()
      : [];
    const simpleById = {};
    for (const s of simples) {
      simpleById[s._id.toString()] = {
        documentNumber: String(s.documentNumber || "").trim(),
        recordType: String(s.recordType || "").trim(),
      };
    }

    const rows = movements.map((m) => {
      const sid = String(m.simpleServiceProposalId || "").trim();
      const simple = sid ? simpleById[sid] : null;
      const docNum =
        String(m.documentNumber || "").trim() ||
        simple?.documentNumber ||
        String(m.poNumber || "").trim() ||
        "";
      return {
        id: m._id.toString(),
        type: m.type,
        typeLabel: movementTypeLabel(m.type),
        typeVariant: movementTypeVariant(m.type),
        qty: Number(m.qty) || 0,
        balanceAfter: m.balanceAfter == null ? null : Number(m.balanceAfter),
        purchaseOrderId: String(m.purchaseOrderId || "").trim(),
        poNumber: String(m.poNumber || "").trim(),
        vendorName: String(m.vendorName || "").trim(),
        simpleServiceProposalId: sid,
        documentNumber: docNum,
        quoteId: String(m.quoteId || "").trim(),
        workOrderId: String(m.workOrderId || "").trim(),
        reservationId: String(m.reservationId || "").trim(),
        relatedMovementId: String(m.relatedMovementId || "").trim(),
        reason: String(m.reason || "").trim(),
        notes: String(m.notes || "").trim(),
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
      };
    });

    const reservationRows = reservations.map((r) => {
      const sid = String(r.simpleServiceProposalId || "").trim();
      const simple = sid ? simpleById[sid] : null;
      return {
        reservationId: r._id.toString(),
        qty: Number(r.qty) || 0,
        status: r.status,
        simpleServiceProposalId: sid,
        documentNumber: simple?.documentNumber || "",
        quoteId: String(r.quoteId || "").trim(),
        workOrderId: String(r.workOrderId || "").trim(),
        reservedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      };
    });

    const onHand = Number(item.onHand) || 0;
    const reserved = Number(item.reserved) || 0;

    return NextResponse.json({
      part: {
        id: item._id.toString(),
        name: item.name ?? "",
        sku: item.sku ?? "",
        uom: item.uom ?? "ea",
        onHand,
        reserved,
        available: onHand - reserved,
      },
      rows,
      reservations: reservationRows,
    });
  } catch (err) {
    console.error("Inventory movements GET:", err);
    return NextResponse.json({ error: "Failed to load movements" }, { status: 500 });
  }
}
