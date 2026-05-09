import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketplaceWantRequest from "@/models/MarketplaceWantRequest";
import { getAdminFromRequest } from "@/lib/auth-admin";

function toRow(d) {
  const o = d?.toObject ? d.toObject() : d;
  return {
    id: String(o._id),
    buyerName: o.buyerName || "",
    buyerEmail: o.buyerEmail || "",
    buyerPhone: o.buyerPhone || "",
    requirements: o.requirements || "",
    searchQuery: o.searchQuery || "",
    categoryFilter: o.categoryFilter || "",
    status: o.status || "new",
    source: o.source || "",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
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
    const [totalCount, list] = await Promise.all([
      MarketplaceWantRequest.countDocuments({}),
      MarketplaceWantRequest.find({}).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    ]);
    return NextResponse.json({ items: list.map((d) => toRow(d)), page, pageSize, totalCount });
  } catch (err) {
    console.error("Admin marketplace want-requests GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
