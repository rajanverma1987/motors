import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { normalizeStatus, ticketToListRow } from "@/lib/support-tickets";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";

const SUPPORT_TICKET_SORT_KEYS = ["ticketRef", "shopName", "createdByEmail", "subject", "category", "status", "updatedAt"];

export async function GET(request) {
  try {
    const adminEmail = await getAdminFromRequest(request);
    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const q = {};
    if (statusRaw && statusRaw !== "all") {
      const st = normalizeStatus(statusRaw);
      if (st) q.status = st;
    }
    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: SUPPORT_TICKET_SORT_KEYS,
      defaultKey: "updatedAt",
      defaultDir: "desc",
    });
    const [totalCount, list] = await Promise.all([
      SupportTicket.countDocuments(q),
      SupportTicket.find(q)
        .sort(mongoSortFromAdmin(sortBy, sortDir))
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);
    return NextResponse.json({ items: list.map(ticketToListRow), page, pageSize, totalCount });
  } catch (err) {
    console.error("Support tickets list (admin):", err);
    return NextResponse.json({ error: "Failed to list tickets" }, { status: 500 });
  }
}
