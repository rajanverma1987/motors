import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { getNextJobNumber } from "@/lib/job-document-numbers";

/** Next RFQ / job number — same series as Classic all-jobs / quotes POST. */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const merged = mergeUserSettings(settingsDoc?.settings);
    const rfqNumber = await getNextJobNumber(email, merged);
    return NextResponse.json({ rfqNumber });
  } catch (err) {
    console.error("Dashboard next RFQ number error:", err);
    return NextResponse.json({ error: "Failed to get next RFQ number" }, { status: 500 });
  }
}
