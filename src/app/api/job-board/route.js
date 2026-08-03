import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { mergeUserSettings } from "@/lib/user-settings";
import { simpleSpToBoardJob } from "@/lib/simple-job-board";

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  } catch (err) {
    console.error("Public job board error:", err);
    return NextResponse.json({ error: "Failed to load job board" }, { status: 500 });
  }
}

/** Public share link: Simple JOB service proposals by shop-floor status. */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }
    await connectDB();
    const settingsDoc = await UserSettings.findOne({
      "settings.jobBoardToken": token,
    }).lean();
    if (!settingsDoc) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }
    const email = settingsDoc.ownerEmail;
    const merged = mergeUserSettings(settingsDoc.settings);
    const list = await SimpleServiceProposal.find({
      createdByEmail: email,
      recordType: "JOB",
    })
      .sort({ updatedAt: -1 })
      .lean();
    const workOrders = (list || []).map((doc) => simpleSpToBoardJob(doc));
    return NextResponse.json({
      workOrders,
      jobs: workOrders,
      workOrderStatuses: merged.workOrderStatuses,
      shopFloorBoardOrder: merged.shopFloorBoardOrder,
      workOrderStatusTileColors: merged.workOrderStatusTileColors || {},
    });
  } catch (err) {
    console.error("Public job board POST:", err);
    return NextResponse.json({ error: "Failed to load job board" }, { status: 500 });
  }
}
