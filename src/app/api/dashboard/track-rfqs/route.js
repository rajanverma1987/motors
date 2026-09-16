import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { listTrackLeadsForShop, trackRfqStateForLead } from "@/lib/track-shop-conversion";

export const dynamic = "force-dynamic";

/** §9.4 / §14.2 - the shop's list of Motor Down RFQs from IQMotorTrack. */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const statusFilter = String(searchParams.get("status") || "").trim();
    const qText = String(searchParams.get("q") || "").trim().toLowerCase();

    const { leads } = await listTrackLeadsForShop(user.email);
    const rows = [];
    for (const lead of leads) {
      const state = await trackRfqStateForLead(lead);
      rows.push({
        id: String(lead._id),
        status: String(lead.status || "new"),
        createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : null,
        company: String(lead.trackFacilityName || lead.company || ""),
        contactName: String(lead.name || ""),
        city: String(lead.city || ""),
        urgencyLevel: String(lead.urgencyLevel || ""),
        motorSummary: String(lead.trackMotorSnapshot?.title || "")
          || [lead.motorType, lead.motorHp, lead.voltage].filter(Boolean).join(" · "),
        serialNumber: String(lead.trackMotorSnapshot?.serialNumber || ""),
        invitedShopCount: Number(lead.trackInvitedShopCount) || 0,
        datasheetShared: Boolean(lead.trackDatasheetSnapshot),
        proposalId: String(lead.trackProposalId || ""),
        viewedAt: lead.trackViewedAt ? new Date(lead.trackViewedAt).toISOString() : null,
        reference: state?.reference || "",
        rfqStatus: state?.rfqStatus || "",
        invitationStatus: state?.invitationStatus || "",
        awarded: Boolean(state?.awarded),
        notSelected: Boolean(state?.notSelected),
        cancelled: Boolean(state?.cancelled),
      });
    }

    let out = rows;
    if (statusFilter) out = out.filter((row) => row.status === statusFilter);
    if (qText) {
      out = out.filter((row) =>
        [row.company, row.contactName, row.motorSummary, row.serialNumber, row.reference].some((v) =>
          String(v || "").toLowerCase().includes(qText)
        )
      );
    }

    return NextResponse.json({ items: out, totalCount: out.length });
  } catch (err) {
    console.error("Dashboard track RFQ list error:", err);
    return NextResponse.json({ error: "Failed to load IQMotorTrack requests" }, { status: 500 });
  }
}
