import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import QuickBooksConnection from "@/models/QuickBooksConnection";
import QuickBooksSyncLog from "@/models/QuickBooksSyncLog";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { intuitConfigured } from "@/lib/quickbooks/constants";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();

    const conn = await QuickBooksConnection.findOne({ ownerEmail: email, active: true }).lean();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const settings = mergeUserSettings(settingsDoc?.settings);

    const logs = await QuickBooksSyncLog.find({ ownerEmail: email })
      .sort({ occurredAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      configured: intuitConfigured(),
      connected: !!conn,
      companyName: conn?.companyName || "",
      realmId: conn?.realmId || "",
      connectedAt: conn?.connectedAt || null,
      quickBooksEnabled: !!settings.quickBooksEnabled,
      quickBooksJobClosedStatuses: settings.quickBooksJobClosedStatuses || [],
      quickBooksDefaultIncomeAccountId: settings.quickBooksDefaultIncomeAccountId || "",
      quickBooksDefaultExpenseAccountId: settings.quickBooksDefaultExpenseAccountId || "",
      recentSyncs: logs.map((l) => ({
        id: String(l._id),
        entityType: l.entityType,
        localId: l.localId,
        quickBooksId: l.quickBooksId,
        action: l.action,
        status: l.status,
        message: l.message,
        occurredAt: l.occurredAt,
      })),
    });
  } catch (err) {
    console.error("QuickBooks status:", err);
    return NextResponse.json({ error: "Failed to load QuickBooks status" }, { status: 500 });
  }
}
