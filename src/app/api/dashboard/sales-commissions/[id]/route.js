import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SalesCommission from "@/models/SalesCommission";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function toJson(doc) {
  const row = doc && (doc.toObject ? doc.toObject() : doc);
  if (!row) return null;
  return {
    id: row._id?.toString(),
    quoteId: row.quoteId ?? "",
    rfqNumber: row.rfqNumber ?? "",
    salesPersonId: row.salesPersonId ?? "",
    amount: Number(row.amount || 0),
    status: row.status === "paid" ? "paid" : "unpaid",
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
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
    if (body?.status !== "paid") {
      return NextResponse.json({ error: "Only status change to paid is allowed" }, { status: 400 });
    }

    if (doc.status !== "paid") {
      doc.status = "paid";
      doc.paidAt = new Date();
      await doc.save();
    }

    return NextResponse.json({ ok: true, commission: toJson(doc) });
  } catch (err) {
    console.error("Dashboard update sales commission status error:", err);
    return NextResponse.json({ error: err.message || "Failed to update sales commission" }, { status: 500 });
  }
}
