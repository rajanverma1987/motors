import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import Motor from "@/models/Motor";
import Customer from "@/models/Customer";
import Quote from "@/models/Quote";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { sanitizeSpecs } from "@/lib/sanitize-specs";
import {
  workOrderToBoardPayload,
  notifyWorkOrderBoardUpdated,
  notifyWorkOrderBoardDeleted,
} from "@/lib/job-board-emit";
import { notifyTechnicianWorkOrderAssigned } from "@/lib/notify-technician-work-order";
import {
  isShippedStatus,
  consumeInventoryForQuoteOnShipped,
  releaseInventoryReservationsForQuote,
} from "@/lib/inventory-service";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

const LIMITS_SHORT = 200;

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await WorkOrder.findOne({ _id: id, createdByEmail: email }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const customer = await Customer.findOne({
      _id: doc.customerId,
      createdByEmail: email,
    }).lean();
    const quote = await Quote.findOne({
      _id: doc.quoteId,
      createdByEmail: email,
    })
      .select({ scopeLines: 1, partsLines: 1 })
      .lean();
    const quoteScopeForTech = Array.isArray(quote?.scopeLines)
      ? quote.scopeLines
          .slice(0, 100)
          .map((row) => ({ scope: String(row?.scope ?? "").slice(0, 2000) }))
          .filter((r) => r.scope.trim())
      : [];
    const quoteOtherCostForTech = Array.isArray(quote?.partsLines)
      ? quote.partsLines
          .slice(0, 100)
          .map((row) => ({
            item: String(row?.item ?? "").slice(0, 500),
            qty: String(row?.qty ?? "1").slice(0, 50),
            uom: String(row?.uom ?? "").slice(0, 50),
          }))
          .filter((r) => r.item.trim())
      : [];
    return NextResponse.json({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
      customerCompany:
        customer?.companyName || customer?.primaryContactName || doc.companyName || "",
      quoteScopeForTech,
      quoteOtherCostForTech,
    });
  } catch (err) {
    console.error("Get work order:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await WorkOrder.findOne({ _id: id, createdByEmail: email });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json().catch(() => ({}));

    const previousTechnicianId = String(doc.technicianEmployeeId || "").trim();
    const previousStatus = String(doc.status || "").trim();

    if (body.date !== undefined) doc.date = String(body.date || "").slice(0, 20);
    if (body.technicianEmployeeId !== undefined) {
      doc.technicianEmployeeId = String(body.technicianEmployeeId || "").trim();
    }
    if (body.jobType !== undefined) {
      doc.jobType =
        body.jobType === "field_frame_only" ? "field_frame_only" : "complete_motor";
    }
    if (body.status !== undefined) doc.status = String(body.status || "").trim().slice(0, 80);
    if (body.acSpecs !== undefined && doc.motorClass === "AC") {
      doc.acSpecs = sanitizeSpecs(body.acSpecs);
    }
    if (body.dcSpecs !== undefined && doc.motorClass === "DC") {
      doc.dcSpecs = sanitizeSpecs(body.dcSpecs);
    }
    if (body.armatureSpecs !== undefined && doc.motorClass === "DC") {
      doc.armatureSpecs = sanitizeSpecs(body.armatureSpecs);
    }
    await doc.save();

    const newStatus = String(doc.status || "").trim();
    if (
      doc.quoteId &&
      isShippedStatus(newStatus) &&
      !isShippedStatus(previousStatus)
    ) {
      try {
        await consumeInventoryForQuoteOnShipped(email, String(doc.quoteId));
      } catch (invErr) {
        console.error("Consume inventory on shipped:", invErr);
      }
    }

    const customer = await Customer.findOne({
      _id: doc.customerId,
      createdByEmail: email,
    })
      .select({ companyName: 1, primaryContactName: 1 })
      .lean();
    const customerCompany =
      customer?.companyName || customer?.primaryContactName || doc.companyName || "";

    const newTechnicianId = String(doc.technicianEmployeeId || "").trim();
    if (
      body.technicianEmployeeId !== undefined &&
      newTechnicianId &&
      newTechnicianId !== previousTechnicianId
    ) {
      notifyTechnicianWorkOrderAssigned({
        shopEmail: email,
        assigneeEmployeeId: newTechnicianId,
        workOrderId: doc._id.toString(),
        workOrderNumber: doc.workOrderNumber,
        companyName: customerCompany || doc.companyName,
        quoteRfqNumber: doc.quoteRfqNumber,
      }).catch(() => {});
    }

    notifyWorkOrderBoardUpdated(
      email,
      workOrderToBoardPayload(doc, customerCompany)
    ).catch(() => {});

    const motor = await Motor.findOne({
      _id: doc.motorId,
      createdByEmail: email,
    });
    if (motor) {
      if (doc.motorClass === "AC" && doc.acSpecs && typeof doc.acSpecs === "object") {
        motor.acSpecs = { ...(motor.acSpecs || {}), ...doc.acSpecs };
        motor.markModified("acSpecs");
      }
      if (doc.motorClass === "DC") {
        if (doc.dcSpecs && typeof doc.dcSpecs === "object") {
          motor.dcSpecs = { ...(motor.dcSpecs || {}), ...doc.dcSpecs };
          motor.markModified("dcSpecs");
        }
        if (doc.armatureSpecs && typeof doc.armatureSpecs === "object") {
          motor.dcArmatureSpecs = { ...(motor.dcArmatureSpecs || {}), ...doc.armatureSpecs };
          motor.markModified("dcArmatureSpecs");
        }
      }
      const s =
        doc.motorClass === "AC"
          ? doc.acSpecs || {}
          : { ...(doc.armatureSpecs || {}), ...(doc.dcSpecs || {}) };
      if (s.hp) motor.hp = String(s.hp).slice(0, 50);
      if (s.make) motor.manufacturer = String(s.make).slice(0, LIMITS_SHORT);
      if (s.model) motor.model = String(s.model).slice(0, LIMITS_SHORT);
      if (s.volts) motor.voltage = String(s.volts).slice(0, 50);
      if (s.amps) motor.amps = String(s.amps).slice(0, 50);
      if (s.rpm) motor.rpm = String(s.rpm).slice(0, 50);
      if (s.frame) motor.frameSize = String(s.frame).slice(0, 100);
      if (s.type) motor.motorType = String(s.type).slice(0, 100);
      await motor.save();
    }

    const o = doc.toObject();
    return NextResponse.json({
      ok: true,
      workOrder: { ...o, id: doc._id.toString(), _id: undefined },
    });
  } catch (err) {
    console.error("Patch work order:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const existing = await WorkOrder.findOne({ _id: id, createdByEmail: email })
      .select("quoteId")
      .lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const quoteIdForInv = String(existing.quoteId || "").trim();
    const r = await WorkOrder.deleteOne({
      _id: id,
      createdByEmail: email,
    });
    if (r.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (quoteIdForInv) {
      const remaining = await WorkOrder.countDocuments({
        createdByEmail: email,
        quoteId: quoteIdForInv,
      });
      if (remaining === 0) {
        try {
          await releaseInventoryReservationsForQuote(email, quoteIdForInv);
        } catch (invErr) {
          console.error("Release inventory on WO delete:", invErr);
        }
      }
    }
    notifyWorkOrderBoardDeleted(email, id).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete work order:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
