import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";
import { applyTrackDeclinedToQuote } from "@/lib/track-integration";
import { loadTrackLeadForShop } from "@/lib/track-shop-conversion";
import { TRACK_DECLINE_REASONS } from "@/lib/track-rfq";

export const dynamic = "force-dynamic";

async function resolveId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return String(params?.id || "").trim();
}

/** §9.4 - Decline to Quote, with the reason the plant sees. */
export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await loadTrackLeadForShop(user.email, await resolveId(context));
    if (!lead) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const reason = TRACK_DECLINE_REASONS.find((r) => r.value === String(body?.reason || ""));
    if (!reason) return NextResponse.json({ error: "Pick a reason." }, { status: 400 });
    const note = clampString(body?.note, 400);

    await applyTrackDeclinedToQuote(lead, note ? `${reason.label}: ${note}` : reason.label);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Dashboard track RFQ decline error:", err);
    return NextResponse.json({ error: err.message || "Failed to decline" }, { status: 500 });
  }
}
