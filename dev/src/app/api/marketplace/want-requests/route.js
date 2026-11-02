import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketplaceWantRequest from "@/models/MarketplaceWantRequest";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public: submit a "looking for" request when marketplace has no matching listings.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const buyerName = typeof body.buyerName === "string" ? body.buyerName.trim() : "";
    const buyerEmail = typeof body.buyerEmail === "string" ? body.buyerEmail.trim().toLowerCase() : "";
    const buyerPhone = typeof body.buyerPhone === "string" ? body.buyerPhone.trim() : "";
    const requirements = typeof body.requirements === "string" ? body.requirements.trim() : "";
    const searchQuery = typeof body.searchQuery === "string" ? body.searchQuery.trim().slice(0, 500) : "";
    const categoryFilter = typeof body.categoryFilter === "string" ? body.categoryFilter.trim().slice(0, 64) : "";

    if (!buyerName || buyerName.length > 200) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!buyerEmail || !EMAIL_RE.test(buyerEmail)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }
    if (!requirements || requirements.length < 10) {
      return NextResponse.json(
        { error: "Please describe what you need (at least 10 characters)." },
        { status: 400 }
      );
    }
    if (requirements.length > 8000) {
      return NextResponse.json({ error: "Requirements are too long." }, { status: 400 });
    }

    await connectDB();
    await MarketplaceWantRequest.create({
      buyerName,
      buyerEmail,
      buyerPhone,
      requirements,
      searchQuery,
      categoryFilter,
      status: "new",
      source: "marketplace_empty",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Marketplace want-request POST:", err);
    return NextResponse.json({ error: "Could not save your request. Try again later." }, { status: 500 });
  }
}
