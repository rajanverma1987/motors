import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { getPaypalSubscription } from "@/lib/paypal-api";
import { applyTrackSubscriptionActivated } from "@/lib/track-subscription";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const subscriptionId = String(body?.subscriptionId || "").trim();
    if (!token || !subscriptionId) {
      return NextResponse.json({ error: "Missing checkout token or subscription id." }, { status: 400 });
    }

    await connectDB();
    const facility = await TrackFacility.findOne({
      paypalCheckoutToken: token,
      paypalCheckoutTokenExpiresAt: { $gt: new Date() },
    });
    if (!facility) {
      return NextResponse.json(
        { error: "This checkout link expired. Open IQMotorTrack and try Subscribe again." },
        { status: 410 }
      );
    }

    try {
      await getPaypalSubscription(subscriptionId);
    } catch (err) {
      console.warn("Track checkout complete verify:", err.message);
    }

    facility.paypalSubscriptionId = subscriptionId;
    facility.paypalCheckoutToken = "";
    facility.paypalCheckoutTokenExpiresAt = null;
    facility.plan = "pro";
    facility.subscriptionStatus = "active";
    facility.lastPaymentAt = new Date();
    const period = new Date();
    period.setMonth(period.getMonth() + 1);
    facility.currentPeriodEndsAt = period;
    await facility.save();

    await applyTrackSubscriptionActivated({
      paypalSubscriptionId: subscriptionId,
      eventId: `checkout-complete-${subscriptionId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track checkout complete:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
