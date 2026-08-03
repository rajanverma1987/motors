import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergeUserSettings } from "@/lib/user-settings";
import { simpleSpToBoardJob } from "@/lib/simple-job-board";

/** Authenticated Simple shop-floor board payload (JOB service proposals). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();

    const [list, settingsDoc] = await Promise.all([
      SimpleServiceProposal.find({ createdByEmail: email, recordType: "JOB" })
        .sort({ updatedAt: -1 })
        .lean(),
      UserSettings.findOne({ ownerEmail: email }).lean(),
    ]);

    const merged = mergeUserSettings(settingsDoc?.settings);
    const jobs = (list || []).map((doc) => simpleSpToBoardJob(doc));

    return NextResponse.json({
      jobs,
      /** Alias for Classic public board client compatibility */
      workOrders: jobs,
      workOrderStatuses: merged.workOrderStatuses,
      shopFloorBoardOrder: merged.shopFloorBoardOrder,
      workOrderStatusTileColors: merged.workOrderStatusTileColors || {},
    });
  } catch (err) {
    console.error("Simple job board GET:", err);
    return NextResponse.json({ error: "Failed to load job board" }, { status: 500 });
  }
}
