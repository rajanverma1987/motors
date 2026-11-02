import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackIntegrationEvent from "@/models/TrackIntegrationEvent";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { retryTrackPendingDeliveries } from "@/lib/track-integration";

export const dynamic = "force-dynamic";

/** §14.11 - integration delivery log with failures visible to platform admin. */
export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const statusFilter = String(searchParams.get("status") || "").trim();
    const typeFilter = String(searchParams.get("eventType") || "").trim();
    const qText = String(searchParams.get("q") || "").trim();

    const query = {};
    if (statusFilter) query.status = statusFilter;
    if (typeFilter) query.eventType = typeFilter;
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { idempotencyKey: rx },
        { rfqRequestId: rx },
        { invitationId: rx },
        { listingId: rx },
        { leadId: rx },
        { proposalId: rx },
        { lastError: rx },
      ];
    }

    const [rows, totalCount, counts] = await Promise.all([
      TrackIntegrationEvent.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      TrackIntegrationEvent.countDocuments(query),
      TrackIntegrationEvent.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    return NextResponse.json({
      events: rows.map((row) => ({
        id: String(row._id),
        eventType: String(row.eventType || ""),
        direction: String(row.direction || ""),
        status: String(row.status || ""),
        attempts: Number(row.attempts) || 0,
        lastError: String(row.lastError || ""),
        idempotencyKey: String(row.idempotencyKey || ""),
        rfqRequestId: String(row.rfqRequestId || ""),
        invitationId: String(row.invitationId || ""),
        listingId: String(row.listingId || ""),
        leadId: String(row.leadId || ""),
        proposalId: String(row.proposalId || ""),
        nextAttemptAt: row.nextAttemptAt ? new Date(row.nextAttemptAt).toISOString() : null,
        deliveredAt: row.deliveredAt ? new Date(row.deliveredAt).toISOString() : null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      })),
      page,
      pageSize,
      totalCount,
      statusCounts: counts.map((row) => ({ status: String(row._id || ""), count: Number(row.count) || 0 })),
    });
  } catch (err) {
    console.error("Admin track integration events GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/** Manual resend. Re-delivers pending RFQ invitations without duplicating Leads. */
export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.eventId || "").trim();

    await connectDB();
    if (eventId) {
      // Clear the backoff so the retry pass picks this event up now.
      await TrackIntegrationEvent.updateOne(
        { _id: eventId, status: { $in: ["pending", "failed"] } },
        { $set: { status: "pending", nextAttemptAt: null } }
      );
    }
    const results = await retryTrackPendingDeliveries({ limit: eventId ? 5 : 25 });
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("Admin track integration resend:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
