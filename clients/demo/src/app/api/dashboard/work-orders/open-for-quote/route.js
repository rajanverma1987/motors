import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { findOpenWorkOrdersForQuote } from "@/lib/work-order-open-for-quote";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const quoteId = String(searchParams.get("quoteId") || "").trim();
    if (!quoteId) {
      return NextResponse.json({ error: "quoteId required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const openWorkOrders = await findOpenWorkOrdersForQuote(email, quoteId);
    return NextResponse.json({ openWorkOrders });
  } catch (err) {
    console.error("Open work orders for quote:", err);
    return NextResponse.json({ error: "Failed to check work orders" }, { status: 500 });
  }
}
