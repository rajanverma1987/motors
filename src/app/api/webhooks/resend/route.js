import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";
import ListingMarketingState from "@/models/ListingMarketingState";
import { verifyResendWebhook } from "@/lib/resend-marketing";

export const runtime = "nodejs";

const EVENT_FIELD = {
  "email.delivered": "deliveredAt",
  "email.opened": "openedAt",
  "email.clicked": "clickedAt",
  "email.bounced": "bouncedAt",
  "email.complained": "complainedAt",
  "email.failed": "failedAt",
  "email.delivery_delayed": "delayedAt",
  "email.suppressed": "suppressedAt",
};

function isPermanentBounce(bounce) {
  const type = String(bounce?.type || "").toLowerCase();
  return type === "permanent" || type === "hard";
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const verified = verifyResendWebhook(rawBody, request.headers);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error || "Unauthorized" }, { status: 401 });
    }

    const event = verified.payload || {};
    const type = String(event.type || "").trim();
    const data = event.data || {};
    const emailId = String(data.email_id || "").trim();
    if (!emailId) {
      return NextResponse.json({ ok: true, ignored: "missing email_id" });
    }

    await connectDB();
    const doc = await ListingMarketingEmail.findOne({ resendId: emailId });
    if (!doc) {
      return NextResponse.json({ ok: true, ignored: "unknown email" });
    }

    const at = event.created_at ? new Date(event.created_at) : new Date();
    const alreadyLogged = Array.isArray(doc.events)
      ? doc.events.some((e) => e.type === type && Math.abs(new Date(e.at) - at) < 2000)
      : false;

    const setOps = {
      lastEventType: type,
      lastEventAt: at,
    };

    if (type === "email.sent" && !doc.sentAt) {
      setOps.sentAt = at;
    }

    const field = EVENT_FIELD[type];
    if (field && !doc[field]) {
      setOps[field] = at;
    }

    if (type === "email.bounced") {
      setOps.bounceType = String(data.bounce?.type || "");
      setOps.bounceMessage = String(data.bounce?.message || "");
    }

    if (type === "email.failed") {
      setOps.status = "failed";
      if (!doc.error) setOps.error = "Resend reported email.failed";
    }

    const updateQuery = { $set: setOps };
    if (type === "email.clicked") {
      updateQuery.$inc = { clickCount: 1 };
    }
    if (!alreadyLogged) {
      updateQuery.$push = {
        events: {
          $each: [{ type, at }],
          $slice: -40,
        },
      };
    }

    await ListingMarketingEmail.updateOne({ _id: doc._id }, updateQuery);

    const shouldUnsub =
      type === "email.complained" || (type === "email.bounced" && isPermanentBounce(data.bounce));
    if (shouldUnsub) {
      await ListingMarketingState.findOneAndUpdate(
        { listingId: doc.listingId },
        {
          $set: {
            listingId: doc.listingId,
            unsubscribedAt: at,
            awaitingRestartTemplate: false,
          },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resend webhook error:", err);
    return NextResponse.json({ error: err.message || "Webhook failed" }, { status: 500 });
  }
}
