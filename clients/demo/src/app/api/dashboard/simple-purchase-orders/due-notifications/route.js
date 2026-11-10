import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  normalizeWorkspaceSmtpFields,
  workspaceSmtpIsReadyForSendUi,
  workspaceSmtpIsComplete,
} from "@/lib/workspace-smtp-fields";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  findDuePurchaseOrders,
  parseNotificationEmails,
  sendPoDueNotifications,
} from "@/lib/simple-po-due-notifications";
import { toInputDateValue } from "@/lib/format-date";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const emailNorm = user.email.trim().toLowerCase();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: emailNorm }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);

    const smtp = normalizeWorkspaceSmtpFields(uSettings);
    const smtpReady = workspaceSmtpIsReadyForSendUi(smtp) && workspaceSmtpIsComplete(smtp);

    const configuredRecipients = parseNotificationEmails(uSettings.poDueNotificationEmails);
    const recipients = configuredRecipients.length ? configuredRecipients : [emailNorm];

    const dueResult = await findDuePurchaseOrders({
      ownerEmail: emailNorm,
      daysBefore: uSettings.poDueNotificationDaysBefore ?? 2,
      includeOverdue: uSettings.poDueNotificationIncludeOverdue !== false,
    });

    const { searchParams } = new URL(request.url);
    const shouldAutoCheck = searchParams.get("autoCheck") === "1";

    let autoSent = false;
    let autoMessage = null;

    if (
      shouldAutoCheck &&
      smtpReady &&
      uSettings.poDueNotificationEnabled !== false &&
      uSettings.poDueNotificationAutoSend !== false &&
      dueResult.all.length > 0
    ) {
      const todayYmd = toInputDateValue(new Date());
      const lastRunYmd = uSettings.poDueNotificationLastAutoRunAt
        ? toInputDateValue(uSettings.poDueNotificationLastAutoRunAt)
        : "";

      // Only auto-send once per calendar day
      if (todayYmd !== lastRunYmd) {
        const baseUrl = getPublicSiteUrl(request);
        const sendResult = await sendPoDueNotifications({
          ownerEmail: emailNorm,
          force: false,
          baseUrl,
        });
        if (sendResult.sent) {
          autoSent = true;
          autoMessage = sendResult.message;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      approaching: dueResult.approaching,
      overdue: dueResult.overdue,
      totalCount: dueResult.all.length,
      approachingCount: dueResult.approaching.length,
      overdueCount: dueResult.overdue.length,
      recipients,
      smtpReady,
      smtpEnabled: smtp.smtpEnabled,
      smtpFromEmail: smtp.smtpFromEmail,
      enabled: uSettings.poDueNotificationEnabled !== false,
      daysBefore: uSettings.poDueNotificationDaysBefore ?? 2,
      includeOverdue: uSettings.poDueNotificationIncludeOverdue !== false,
      autoSend: uSettings.poDueNotificationAutoSend !== false,
      lastRunAt: uSettings.poDueNotificationLastAutoRunAt || "",
      autoSent,
      autoMessage,
    });
  } catch (err) {
    console.error("GET po due notifications error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check purchase order due dates" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const emailNorm = user.email.trim().toLowerCase();
    const baseUrl = getPublicSiteUrl(request);

    const result = await sendPoDueNotifications({
      ownerEmail: emailNorm,
      force: body?.force !== false,
      baseUrl,
      customRecipients: body?.recipients,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Failed to send notifications" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST po due notifications error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to send purchase order due notifications" },
      { status: 500 }
    );
  }
}
