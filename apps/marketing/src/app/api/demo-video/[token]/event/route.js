import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["page", "play", "progress", "complete", "book"]);

export async function POST(request, context) {
  try {
    const resolved = typeof context?.params?.then === "function" ? await context.params : context?.params;
    const token = String(resolved?.token || "").trim();
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const type = String(body?.type || "").trim();
    if (!TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    await connectDB();
    const doc = await ListingMarketingEmail.findOne({ watchToken: token, status: "sent" });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date();
    const setOps = {};
    if (type === "page" && !doc.demoPageOpenedAt) setOps.demoPageOpenedAt = now;
    if (type === "play" && !doc.demoPlayedAt) setOps.demoPlayedAt = now;
    if (type === "complete" && !doc.demoCompletedAt) setOps.demoCompletedAt = now;
    if (type === "book" && !doc.demoBookClickedAt) setOps.demoBookClickedAt = now;

    let percent = Number(body?.percent);
    if (type === "play") percent = Math.max(Number.isFinite(percent) ? percent : 0, 1);
    if (type === "complete") percent = 100;
    if (Number.isFinite(percent)) {
      percent = Math.max(0, Math.min(100, Math.round(percent)));
      if (percent > Number(doc.demoMaxPercent || 0)) setOps.demoMaxPercent = percent;
      if (percent >= 100 && !doc.demoCompletedAt && !setOps.demoCompletedAt) {
        setOps.demoCompletedAt = now;
      }
    }

    if (Object.keys(setOps).length) {
      await ListingMarketingEmail.updateOne(
        { _id: doc._id },
        {
          $set: setOps,
          $push: {
            events: {
              $each: [{ type: `demo.${type}`, at: now }],
              $slice: -40,
            },
          },
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Demo video event error:", err);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }
}
