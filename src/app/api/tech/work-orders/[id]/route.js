import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import WorkOrder from "@/models/WorkOrder";
import Customer from "@/models/Customer";
import Quote from "@/models/Quote";
import Motor from "@/models/Motor";
import { getTechnicianFromRequest } from "@/lib/auth-portal";
import { sanitizeSpecs } from "@/lib/sanitize-specs";
import {
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  JOB_TYPE_OPTIONS,
} from "@/lib/work-order-fields";
import {
  workOrderToBoardPayload,
  notifyWorkOrderBoardUpdated,
} from "@/lib/job-board-emit";

const LIMITS_SHORT = 200;

function mapTechPhoto(p) {
  if (!p || !p.url) return null;
  return {
    url: String(p.url).trim(),
    uploadedAt: p.uploadedAt ? new Date(p.uploadedAt).toISOString() : null,
    authorName: String(p.authorName || "").trim(),
  };
}

function mapTechPhotoList(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(mapTechPhoto).filter(Boolean);
}

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await connectDB();
    const doc = await WorkOrder.findOne({
      _id: id,
      createdByEmail: tech.shopEmail,
    }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const customer = await Customer.findOne({
      _id: doc.customerId,
      createdByEmail: tech.shopEmail,
    }).lean();
    const quote = await Quote.findOne({
      _id: doc.quoteId,
      createdByEmail: tech.shopEmail,
    })
      .select({ scopeLines: 1, partsLines: 1 })
      .lean();
    const motor = await Motor.findOne({
      _id: doc.motorId,
      createdByEmail: tech.shopEmail,
    })
      .select({
        serialNumber: 1,
        manufacturer: 1,
        model: 1,
        frameSize: 1,
        motorType: 1,
        hp: 1,
        voltage: 1,
        rpm: 1,
      })
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

    const notes = Array.isArray(doc.technicianAppNotes)
      ? doc.technicianAppNotes
          .map((n) => ({
            at: n.at,
            text: n.text || "",
            authorName: n.authorName || "",
          }))
          .filter((n) => n.text.trim())
      : [];

    return NextResponse.json({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
      customerCompany:
        customer?.companyName || customer?.primaryContactName || doc.companyName || "",
      quoteScopeForTech,
      quoteOtherCostForTech,
      /** Same { key, label }[] as CRM work order modal — drive mobile UI. */
      fieldLayouts: {
        ac: AC_WORK_ORDER_FIELDS,
        dcMotor: DC_WORK_ORDER_FIELDS,
        armature: DC_ARMATURE_FIELDS,
        jobTypes: JOB_TYPE_OPTIONS,
      },
      motorSummary: motor
        ? {
            serialNumber: motor.serialNumber || "",
            manufacturer: motor.manufacturer || "",
            model: motor.model || "",
            frameSize: motor.frameSize || "",
            motorType: motor.motorType || "",
            hp: motor.hp || "",
            voltage: motor.voltage || "",
            rpm: motor.rpm || "",
          }
        : null,
      technicianAppNotes: notes,
      technicianBeforePhotos: mapTechPhotoList(doc.technicianBeforePhotos),
      technicianAfterPhotos: mapTechPhotoList(doc.technicianAfterPhotos),
    });
  } catch (err) {
    console.error("Tech get work order:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const tech = await getTechnicianFromRequest(request);
    if (!tech) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await connectDB();
    const doc = await WorkOrder.findOne({
      _id: id,
      createdByEmail: tech.shopEmail,
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));

    if (body.status !== undefined) {
      doc.status = String(body.status || "").trim().slice(0, 80);
    }

    if (body.appendNote !== undefined) {
      const text = String(body.appendNote || "").trim().slice(0, 4000);
      if (text) {
        if (!Array.isArray(doc.technicianAppNotes)) doc.technicianAppNotes = [];
        doc.technicianAppNotes.push({
          at: new Date(),
          text,
          authorId: tech.employeeId,
          authorName: tech.name || tech.employeeEmail || "Technician",
        });
        doc.markModified("technicianAppNotes");
      }
    }

    // WO date, job type, and assignment fields are CRM-only from the technician app.
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

    const customer = await Customer.findOne({
      _id: doc.customerId,
      createdByEmail: tech.shopEmail,
    })
      .select({ companyName: 1, primaryContactName: 1 })
      .lean();
    const customerCompany =
      customer?.companyName || customer?.primaryContactName || doc.companyName || "";
    notifyWorkOrderBoardUpdated(tech.shopEmail, workOrderToBoardPayload(doc, customerCompany)).catch(
      () => {}
    );

    const motor = await Motor.findOne({
      _id: doc.motorId,
      createdByEmail: tech.shopEmail,
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
    console.error("Tech patch work order:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
