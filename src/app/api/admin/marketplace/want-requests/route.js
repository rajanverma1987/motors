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
    const list = await MarketplaceWantRequest.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return NextResponse.json(list.map((d) => toRow(d)));
  } catch (err) {
    console.error("Admin marketplace want-requests GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
