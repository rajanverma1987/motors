import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import WorkOrder from "@/models/WorkOrder";
import Customer from "@/models/Customer";
import { mergeUserSettings } from "@/lib/user-settings";

export async function GET() {
  try {
    await connectDB();
    // This endpoint is public and returns nothing without a valid token; use /job-board page for viewing.
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  } catch (err) {
    console.error("Public job board error:", err);
    return NextResponse.json({ error: "Failed to load job board" }, { status: 500 });
  }
}

export async function POST(request) {
  // Public: body should contain { token }
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
    const list = await WorkOrder.find({ createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    const customerIds = [...new Set(list.map((w) => w.customerId).filter(Boolean))];
    const customers = await Customer.find({
      _id: { $in: customerIds },
      createdByEmail: email,
    })
      .lean()
      .catch(() => []);
    const custMap = Object.fromEntries(
      (customers || []).map((c) => [c._id.toString(), c.companyName || c.primaryContactName || ""])
    );
    const workOrders = list.map((w) => ({
      ...w,
      id: w._id.toString(),
      _id: undefined,
      customerCompany: custMap[w.customerId] || "",
    }));
    return NextResponse.json({
      workOrders,
      workOrderStatuses: merged.workOrderStatuses,
      shopFloorBoardOrder: merged.shopFloorBoardOrder,
    });
  } catch (err) {
    console.error("Public job board POST error:", err);
    return NextResponse.json({ error: "Failed to load job board" }, { status: 500 });
  }
}

// placeholder
