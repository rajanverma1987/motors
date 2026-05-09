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
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const q = { sellerType: "platform" };
    const [totalCount, list] = await Promise.all([
      MarketplaceOrder.countDocuments(q),
      MarketplaceOrder.find(q).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    ]);
    return NextResponse.json({ items: list.map((d) => toRow(d)), page, pageSize, totalCount });
  } catch (err) {
    console.error("Admin marketplace orders GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
