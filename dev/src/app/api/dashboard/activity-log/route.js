import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "").trim();
    const recordId = String(searchParams.get("recordId") || "").trim();
    const recordKind = String(searchParams.get("kind") || "").trim();

    const filter = { ownerEmail: email };
    if (recordId) filter.recordId = recordId;
    if (recordKind === "proposal" || recordKind === "purchaseOrder") {
      filter.recordKind = recordKind;
    }
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { recordNumber: rx },
        { partyName: rx },
        { summary: rx },
        { actorName: rx },
        { actorEmail: rx },
      ];
    }

    const docs = await ActivityLog.find(filter)
      .select({ snapshot: 0 })
      .sort({ createdAt: -1 })
      .limit(150)
      .lean();

    const items = (docs || []).map((doc) => ({
      id: String(doc._id),
      action: String(doc.action || ""),
      recordKind: String(doc.recordKind || ""),
      recordId: String(doc.recordId || ""),
      recordNumber: String(doc.recordNumber || ""),
      partyName: String(doc.partyName || ""),
      summary: String(doc.summary || ""),
      actorName: String(doc.actorName || ""),
      actorEmail: String(doc.actorEmail || ""),
      changes: Array.isArray(doc.changes) ? doc.changes : [],
      createdAt: doc.createdAt || null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("Dashboard activity log error:", err);
    return NextResponse.json({ error: "Failed to load activity log" }, { status: 500 });
  }
}
