import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { loadMergedSettingsForEmail } from "@/lib/simple-service-proposal-list-query";
import { getNextSimplePortalJobNumber } from "@/lib/simple-portal-job-numbers";

/** Next RFQ / job number for Simple portal — always from full DB, never paginated UI rows. */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const mergedSettings = await loadMergedSettingsForEmail(email);
    const documentNumber = await getNextSimplePortalJobNumber(email, mergedSettings);
    return NextResponse.json({ documentNumber, rfqNumber: documentNumber });
  } catch (err) {
    console.error("Dashboard next Simple SP number error:", err);
    return NextResponse.json({ error: "Failed to get next job number" }, { status: 500 });
  }
}
