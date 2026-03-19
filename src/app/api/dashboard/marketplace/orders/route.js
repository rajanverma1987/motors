import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

function toRow(doc) {
  const o = doc?.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    itemId: o.itemId ? String(o.itemId) : "",
    itemTitleSnapshot: o.itemTitleSnapshot || "",
    itemSlugSnapshot: o.itemSlugSnapshot || "",
    sellerType: o.sellerType,
    buyerName: o.buyerName || "",
    buyerEmail: o.buyerEmail || "",
    buyerPhone: o.buyerPhone || "",
    buyerMessage: o.buyerMessage || "",
    quantity: o.quantity ?? 1,
    status: o.status || "new",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const list = await MarketplaceOrder.find({ shopOwnerEmail: email })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    return NextResponse.json(list.map((d) => toRow(d)));
  } catch (err) {
    console.error("Dashboard marketplace orders GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
