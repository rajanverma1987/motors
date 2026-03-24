import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import InventoryReservation from "@/models/InventoryReservation";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

/** GET — reservation / consumption history for one inventory item (work orders, qty, dates). */
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

    const item = await InventoryItem.findOne({ _id: id, createdByEmail: email }).select("name sku uom").lean();
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const reservations = await InventoryReservation.find({
      createdByEmail: email,
      inventoryItemId: id,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const quoteIdSet = new Set();
    const woIdSet = new Set();
    for (const r of reservations) {
      if (r.quoteId) quoteIdSet.add(String(r.quoteId));
      const w1 = String(r.workOrderId || "").trim();
      if (w1 && mongoose.Types.ObjectId.isValid(w1)) woIdSet.add(w1);
      const w2 = String(r.consumedByWorkOrderId || "").trim();
      if (w2 && mongoose.Types.ObjectId.isValid(w2)) woIdSet.add(w2);
    }

    const quoteIds = [...quoteIdSet].filter((q) => mongoose.Types.ObjectId.isValid(q));
    const woIds = [...woIdSet];

    const [quotes, workOrders] = await Promise.all([
      quoteIds.length
        ? Quote.find({ _id: { $in: quoteIds }, createdByEmail: email }).select("rfqNumber").lean()
        : [],
      woIds.length
        ? WorkOrder.find({ _id: { $in: woIds }, createdByEmail: email })
            .select("workOrderNumber quoteRfqNumber")
            .lean()
        : [],
    ]);

    const quoteRfqById = {};
    for (const q of quotes) {
      quoteRfqById[q._id.toString()] = String(q.rfqNumber || "").trim();
    }
    const woById = {};
    for (const w of workOrders) {
      woById[w._id.toString()] = {
        workOrderNumber: String(w.workOrderNumber || "").trim(),
        quoteRfqNumber: String(w.quoteRfqNumber || "").trim(),
      };
    }

    const rows = reservations.map((r) => {
      const qid = String(r.quoteId || "");
      const rfqFromQuote = quoteRfqById[qid] || "";
      const reserveWoId = String(r.workOrderId || "").trim();
      const consumedWoId = String(r.consumedByWorkOrderId || "").trim();
      const displayWoId = r.status === "consumed" && consumedWoId ? consumedWoId : reserveWoId;
      const wo = displayWoId ? woById[displayWoId] : null;
      const workOrderNumber = wo?.workOrderNumber || "";
      const rfq = rfqFromQuote || wo?.quoteRfqNumber || "";

      return {
        reservationId: r._id.toString(),
        quoteId: qid,
        quoteRfqNumber: rfq,
        workOrderId: displayWoId || "",
        workOrderNumber: workOrderNumber || (displayWoId ? "—" : ""),
        qty: Number(r.qty) || 0,
        status: r.status,
        reservedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        usedAt:
          r.status === "consumed" && r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      };
    });

    return NextResponse.json({
      part: {
        id: item._id.toString(),
        name: item.name ?? "",
        sku: item.sku ?? "",
        uom: item.uom ?? "ea",
      },
      rows,
    });
  } catch (err) {
    console.error("Inventory item usage GET:", err);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}
