import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { getListingStatsForOutreach } from "@/lib/listing-page-views";
import { sendListingStatsOutreachEmail } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";

/** POST: send listing stats + shop software subscription outreach to a listed shop. */
export async function POST(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Listing ID required" }, { status: 400 });
    }

    const stats = await getListingStatsForOutreach(id);
    if (!stats) {
      return NextResponse.json(
        { error: "Listing not found, not approved, has no email, or has no recorded visits." },
        { status: 404 }
      );
    }

    const site = getPublicSiteUrl().replace(/\/$/, "");
    const listingUrl = stats.listingPath ? `${site}${stats.listingPath}` : "";

    const result = await sendListingStatsOutreachEmail({
      to: stats.email,
      companyName: stats.companyName,
      listingUrl,
      monthLabel: stats.monthLabel,
      visitsThisMonth: stats.visitsThisMonth,
      visitsOverall: stats.visitsOverall,
      quoteRequestCount: stats.quoteRequestCount,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email: stats.email });
  } catch (err) {
    console.error("Admin listing stats outreach email error:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
