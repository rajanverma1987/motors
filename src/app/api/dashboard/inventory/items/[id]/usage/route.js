import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import InventoryReservation from "@/models/InventoryReservation";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

/** GET — reservation / consumption history for one inventory item (work orders + Simple jobs). */
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
    const simpleIdSet = new Set();
    const woIdSet = new Set();
    for (const r of reservations) {
      const qid = String(r.quoteId || "").trim();
      if (qid) quoteIdSet.add(qid);
      const sid = String(r.simpleServiceProposalId || "").trim();
      if (sid) simpleIdSet.add(sid);
      const w1 = String(r.workOrderId || "").trim();
      if (w1 && mongoose.Types.ObjectId.isValid(w1)) woIdSet.add(w1);
      const w2 = String(r.consumedByWorkOrderId || "").trim();
      if (w2 && mongoose.Types.ObjectId.isValid(w2)) woIdSet.add(w2);
    }

    const quoteIds = [...quoteIdSet].filter((q) => mongoose.Types.ObjectId.isValid(q));
    const simpleIds = [...simpleIdSet].filter((s) => mongoose.Types.ObjectId.isValid(s));
    const woIds = [...woIdSet];

    const [quotes, workOrders, simpleProposals] = await Promise.all([
      quoteIds.length
        ? Quote.find({ _id: { $in: quoteIds }, createdByEmail: email }).select("rfqNumber").lean()
        : [],
      woIds.length
        ? WorkOrder.find({ _id: { $in: woIds }, createdByEmail: email })
            .select("workOrderNumber quoteRfqNumber")
            .lean()
        : [],
      simpleIds.length
        ? SimpleServiceProposal.find({ _id: { $in: simpleIds }, createdByEmail: email })
            .select("documentNumber recordType")
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
    const simpleById = {};
    for (const s of simpleProposals) {
      simpleById[s._id.toString()] = {
        documentNumber: String(s.documentNumber || "").trim(),
        recordType: String(s.recordType || "").trim(),
      };
    }

    const rows = reservations.map((r) => {
      const simpleId = String(r.simpleServiceProposalId || "").trim();
      const simple = simpleId ? simpleById[simpleId] : null;
      if (simple) {
        const jobNumber = simple.documentNumber || "—";
        return {
          reservationId: r._id.toString(),
          quoteId: "",
          quoteRfqNumber: jobNumber,
          jobNumber,
          simpleServiceProposalId: simpleId,
          workOrderId: "",
          workOrderNumber: jobNumber,
          qty: Number(r.qty) || 0,
          status: r.status,
          reservedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
          usedAt:
            r.status === "consumed" && r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
        };
      }

      const qid = String(r.quoteId || "");
      const rfqFromQuote = quoteRfqById[qid] || "";
      const reserveWoId = String(r.workOrderId || "").trim();
      const consumedWoId = String(r.consumedByWorkOrderId || "").trim();
      const displayWoId = r.status === "consumed" && consumedWoId ? consumedWoId : reserveWoId;
      const wo = displayWoId ? woById[displayWoId] : null;
      const workOrderNumber = wo?.workOrderNumber || "";
      const rfq = rfqFromQuote || wo?.quoteRfqNumber || "";
      const jobNumber = workOrderNumber || rfq || (displayWoId ? "—" : "—");

      return {
        reservationId: r._id.toString(),
        quoteId: qid,
        quoteRfqNumber: rfq,
        jobNumber,
        simpleServiceProposalId: "",
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
