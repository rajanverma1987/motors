import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { convertTrackLeadToProposal, loadTrackLeadForShop } from "@/lib/track-shop-conversion";

export const dynamic = "force-dynamic";

async function resolveId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return String(params?.id || "").trim();
}

/** §9.5 - convert an IQMotorTrack Lead into an RFQ-type Service Proposal. */
export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lead = await loadTrackLeadForShop(user.email, await resolveId(context));
    if (!lead) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const result = await convertTrackLeadToProposal({
      email: user.email,
      lead,
      customerId: String(body?.customerId || ""),
      createCustomer: body?.createCustomer === true,
    });

    if (result.needsCustomerChoice) {
      return NextResponse.json(
        {
          error: "Pick the matching customer, or create a new one.",
          code: "CUSTOMER_CHOICE",
          candidates: result.candidates,
        },
        { status: 409 }
      );
    }
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Could not convert." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, existing: Boolean(result.existing), item: result.item });
  } catch (err) {
    console.error("Dashboard track RFQ convert error:", err);
    return NextResponse.json({ error: err.message || "Failed to convert" }, { status: 500 });
  }
}
