import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : Promise.resolve(context.params || {});
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
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
    const doc = await MarketplaceOrder.findOne({ _id: id, shopOwnerEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    doc.status = status;
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Dashboard marketplace order PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
