import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { resolvePoNumber } from "@/lib/purchase-order-numbers";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "job" ? "job" : "shop";
    const quoteId = String(searchParams.get("quoteId") || "").trim();
    const repairFlowJobId = String(searchParams.get("repairFlowJobId") || "").trim();
    const nextPoNumber = await resolvePoNumber(email, { type, quoteId, repairFlowJobId });
    return NextResponse.json({ nextPoNumber });
  } catch (err) {
    console.error("Dashboard next PO number error:", err);
    return NextResponse.json({ error: "Failed to get next PO number" }, { status: 500 });
  }
}
