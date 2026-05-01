import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SalesCommission from "@/models/SalesCommission";
import SalesPerson from "@/models/SalesPerson";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";
import { commissionToJson } from "@/lib/sales-commission-json";
import { normalizeSalesCommissionAttachmentsFromClient } from "@/lib/dashboard-entity-attachments";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await connectDB();
    const doc = await SalesCommission.findOne({ _id: id, createdByEmail: owner }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sp = await SalesPerson.findOne({ _id: doc.salesPersonId, createdByEmail: owner })
      .select("name email phone")
      .lean();
    const salesPersonName = sp ? sp.name || sp.email || sp.phone || String(sp._id) : "";

    return NextResponse.json(
      commissionToJson({ ...doc, salesPersonName }, { includeAttachments: true })
    );
  } catch (err) {
    console.error("Dashboard get sales commission error:", err);
    return NextResponse.json({ error: "Failed to load sales commission" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const owner = user.email.trim().toLowerCase();

    const params = await getParams(context);
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await connectDB();
    const doc = await SalesCommission.findOne({ _id: id, createdByEmail: owner });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const bodyKeys = body && typeof body === "object" ? Object.keys(body) : [];
    const attachmentsOnlyPatch = bodyKeys.length === 1 && bodyKeys[0] === "attachments";
    const statusOnlyPatch =
      bodyKeys.length > 0 && bodyKeys.every((k) => ["status", "paidAt"].includes(k));

    if (attachmentsOnlyPatch) {
      doc.attachments = normalizeSalesCommissionAttachmentsFromClient(body.attachments);
      doc.markModified("attachments");
      await doc.save();
    } else if (statusOnlyPatch) {
      const nextStatus = String(body?.status || "").trim().toLowerCase();
      const status = nextStatus === "paid" ? "paid" : "unpaid";
      const paidAtInput = clampString(body?.paidAt, 50);
      const paidAtDate = paidAtInput ? new Date(`${paidAtInput}T12:00:00.000Z`) : null;
      doc.status = status;
      doc.paidAt =
        status === "paid"
          ? paidAtDate && !Number.isNaN(paidAtDate.getTime())
            ? paidAtDate
            : new Date()
          : null;
      await doc.save();
    } else {
      const nextStatus = String(body?.status || "").trim().toLowerCase();
      const status = nextStatus === "paid" ? "paid" : "unpaid";
      const salesPersonId = clampString(body?.salesPersonId, 200);
      const jobNumber = clampString(body?.jobNumber, 200);
      const quoteId = clampString(body?.quoteId, 200);
      const rfqNumber = clampString(body?.rfqNumber, 200);
      const amountNum = Number(body?.amount);
      const paidAtInput = clampString(body?.paidAt, 50);
      const paidAtDate = paidAtInput ? new Date(`${paidAtInput}T12:00:00.000Z`) : null;

      if (!salesPersonId) {
        return NextResponse.json({ error: "Sales person is required" }, { status: 400 });
      }
      if (!jobNumber) {
        return NextResponse.json({ error: "Job# is required" }, { status: 400 });
      }
      if (!Number.isFinite(amountNum) || amountNum < 0) {
        return NextResponse.json({ error: "Amount must be a valid number" }, { status: 400 });
      }

      doc.salesPersonId = salesPersonId;
      doc.jobNumber = jobNumber;
      doc.quoteId = quoteId;
      doc.rfqNumber = rfqNumber;
      doc.amount = amountNum;
      doc.status = status;
      doc.paidAt =
        status === "paid"
          ? paidAtDate && !Number.isNaN(paidAtDate.getTime())
            ? paidAtDate
            : new Date()
          : null;

      if (body?.attachments !== undefined) {
        doc.attachments = normalizeSalesCommissionAttachmentsFromClient(body.attachments);
        doc.markModified("attachments");
      }

      await doc.save();
    }

    const sp = await SalesPerson.findOne({ _id: doc.salesPersonId, createdByEmail: owner })
      .select("name email phone")
      .lean();
    const salesPersonName = sp ? sp.name || sp.email || sp.phone || String(sp._id) : "";

    return NextResponse.json({
      ok: true,
      commission: commissionToJson({ ...doc.toObject(), salesPersonName }, { includeAttachments: true }),
    });
  } catch (err) {
    console.error("Dashboard update sales commission status error:", err);
    return NextResponse.json({ error: err.message || "Failed to update sales commission" }, { status: 500 });
  }
}
