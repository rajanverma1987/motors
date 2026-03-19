import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import { getAdminFromRequest } from "@/lib/auth-admin";

function toRow(o) {
  const d = o?.toObject ? o.toObject() : o;
  return {
    id: String(d._id),
    itemId: d.itemId ? String(d.itemId) : "",
    itemTitleSnapshot: d.itemTitleSnapshot || "",
    itemSlugSnapshot: d.itemSlugSnapshot || "",
    sellerType: d.sellerType,
    buyerName: d.buyerName || "",
    buyerEmail: d.buyerEmail || "",
    buyerPhone: d.buyerPhone || "",
    buyerMessage: d.buyerMessage || "",
    quantity: d.quantity ?? 1,
    status: d.status || "new",
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const list = await MarketplaceOrder.find({ sellerType: "platform" })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return NextResponse.json(list.map((d) => toRow(d)));
  } catch (err) {
    console.error("Admin marketplace orders GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
