import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketplaceItem from "@/models/MarketplaceItem";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import { LIMITS, clampString, isValidEmail } from "@/lib/validation";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const slug = clampString(body?.itemSlug, 200);
    if (!slug) {
      return NextResponse.json({ error: "Item is required" }, { status: 400 });
    }
    const buyerName = clampString(body?.buyerName, LIMITS.name.max);
    const buyerEmail = clampString(body?.buyerEmail, LIMITS.email.max).toLowerCase();
    const buyerPhone = clampString(body?.buyerPhone, 40);
    const buyerMessage = clampString(body?.buyerMessage, LIMITS.message.max);
    let quantity = Math.min(99, Math.max(1, parseInt(String(body?.quantity || "1"), 10) || 1));

    if (!buyerName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!isValidEmail(buyerEmail)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    await connectDB();
    const item = await MarketplaceItem.findOne({ slug, status: "published" }).lean();
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await MarketplaceOrder.create({
      itemId: item._id,
      itemTitleSnapshot: item.title || "",
      itemSlugSnapshot: item.slug || slug,
      sellerType: item.sellerType,
      shopOwnerEmail: item.sellerType === "shop" ? (item.createdByEmail || "").toLowerCase() : "",
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerMessage,
      quantity,
    });

    return NextResponse.json({ ok: true, message: "Request submitted. The seller will contact you." });
  } catch (err) {
    console.error("Marketplace order POST:", err);
    return NextResponse.json({ error: err.message || "Failed to submit" }, { status: 500 });
  }
}
