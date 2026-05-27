import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import Quote from "@/models/Quote";
import {
  INSPECTION_DONE_QUOTE_STATUS,
  isInspectionDoneStatus,
  isWriteUpStatus,
} from "@/lib/quote-rfq-lifecycle";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const email = user.email.trim().toLowerCase();
    await connectDB();
    const doc = await Quote.findOne({ _id: id, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isWriteUpStatus(doc.status) && !isInspectionDoneStatus(doc.status)) {
      return NextResponse.json(
        { error: "RFQ must be in Write-Up to complete pre-inspection" },
        { status: 400 }
      );
    }

    if (isInspectionDoneStatus(doc.status)) {
      return NextResponse.json({
        ok: true,
        quote: { id: doc._id.toString(), status: doc.status },
      });
    }

    const prevStatus = String(doc.status || "").trim() || "write-up";
    if (!Array.isArray(doc.statusLog)) doc.statusLog = [];
    doc.statusLog.push({
      from: prevStatus,
      to: INSPECTION_DONE_QUOTE_STATUS,
      at: new Date(),
      by:
        (user.contactName && user.contactName.trim()) ||
        (user.shopName && user.shopName.trim()) ||
        user.email?.trim() ||
        "",
    });
    doc.markModified("statusLog");
    doc.status = INSPECTION_DONE_QUOTE_STATUS;
    await doc.save();

    return NextResponse.json({
      ok: true,
      quote: { id: doc._id.toString(), status: doc.status },
    });
  } catch (err) {
    console.error("complete-pre-inspection:", err);
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
