import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import { clampString } from "@/lib/validation";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { emitTrackRfqCancelled } from "@/lib/track-integration";
import { loadOwnedTrackRfq } from "@/lib/track-rfq-service";

export const dynamic = "force-dynamic";

/**
 * §7.6 / §10 - cancel an RFQ. Not allowed once the awarded shop has started the job,
 * because the shop owns the job from that point.
 */
export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const { rfq, motor } = await loadOwnedTrackRfq(facility, String(params?.id || ""));
    if (!rfq) return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    if (["cancelled", "closed"].includes(rfq.status)) {
      return NextResponse.json({ error: "This RFQ is already closed." }, { status: 409 });
    }
    if (["in_repair", "repaired"].includes(rfq.status)) {
      return NextResponse.json(
        {
          error:
            "The shop has already started this job, so it cannot be cancelled here. Contact the shop directly.",
          code: "JOB_STARTED",
        },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = clampString(body?.reason, 500) || "Cancelled by customer";

    rfq.status = "cancelled";
    rfq.cancelledAt = new Date();
    rfq.cancelReason = reason;
    for (const invitation of rfq.invitations || []) {
      if (!["declined"].includes(invitation.status)) invitation.status = "cancelled";
    }
    await rfq.save();

    if (motor) {
      motor.openRfqId = null;
      motor.currentShopName = "";
      motor.currentShopListingId = "";
      if (["awaiting_proposals", "under_repair"].includes(motor.status)) motor.status = "down";
      await motor.save();
    }

    await emitTrackRfqCancelled(rfq, { reason });
    return NextResponse.json({ ok: true, rfq: serializeTrackRfq(rfq) });
  } catch (err) {
    console.error("Track RFQ cancel POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
