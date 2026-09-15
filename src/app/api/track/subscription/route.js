import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, trackSessionPayload, trackUnauthorized } from "@/lib/track-auth";
import { cancelPaypalSubscription } from "@/lib/paypal-api";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const session = await trackSessionPayload(facility);
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("Track subscription GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/** Cancel at period end (PayPal + local flag). */
export async function DELETE(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    const subId = String(facility.paypalSubscriptionId || "").trim();
    if (subId) {
      try {
        await cancelPaypalSubscription(subId, "Cancelled by facility from IQMotorTrack");
      } catch (err) {
        console.warn("Track cancel paypal:", err.message);
      }
    }
    facility.cancelAtPeriodEnd = true;
    const periodEnds = facility.currentPeriodEndsAt ? new Date(facility.currentPeriodEndsAt).getTime() : 0;
    if (periodEnds > Date.now()) {
      facility.subscriptionStatus = "cancelled";
      facility.plan = "pro";
    } else {
      facility.subscriptionStatus = "cancelled";
      facility.plan = "free";
    }
    await facility.save();
    const session = await trackSessionPayload(facility);
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("Track subscription cancel:", err);
    return NextResponse.json({ error: err.message || "Failed to cancel" }, { status: 500 });
  }
}
