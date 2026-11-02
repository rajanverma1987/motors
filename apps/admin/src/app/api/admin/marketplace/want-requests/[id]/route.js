import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import MarketplaceWantRequest from "@/models/MarketplaceWantRequest";
import { getAdminFromRequest } from "@/lib/auth-admin";

const STATUSES = new Set(["new", "reviewing", "contacted", "closed"]);

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
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
    const status = typeof body.status === "string" ? body.status.trim() : "";
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await connectDB();
    const doc = await MarketplaceWantRequest.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: String(doc._id),
      status: doc.status,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("Admin marketplace want-request PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
