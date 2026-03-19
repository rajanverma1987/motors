import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import { getAdminFromRequest } from "@/lib/auth-admin";

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : Promise.resolve(context.params || {});
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const status = body?.status;
    if (!["new", "contacted", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await connectDB();
    const doc = await MarketplaceOrder.findOne({ _id: id, sellerType: "platform" });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    doc.status = status;
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin marketplace order PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
