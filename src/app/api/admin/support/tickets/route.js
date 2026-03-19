import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { normalizeStatus, ticketToListRow } from "@/lib/support-tickets";

export async function GET(request) {
  try {
    const adminEmail = await getAdminFromRequest(request);
    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const q = {};
    if (statusRaw && statusRaw !== "all") {
      const st = normalizeStatus(statusRaw);
      if (st) q.status = st;
    }
    const list = await SupportTicket.find(q).sort({ updatedAt: -1 }).limit(500).lean();
    return NextResponse.json(list.map(ticketToListRow));
  } catch (err) {
    console.error("Support tickets list (admin):", err);
    return NextResponse.json({ error: "Failed to list tickets" }, { status: 500 });
  }
}
