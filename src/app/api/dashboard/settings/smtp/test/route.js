import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergeUserSettings } from "@/lib/user-settings";
import { mergeWorkspaceSmtpPatch } from "@/lib/workspace-smtp-fields";
import { verifyWorkspaceSmtpConnection } from "@/lib/workspace-smtp";

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const stored = mergeUserSettings(doc?.settings);
    const cfg = mergeWorkspaceSmtpPatch(body, stored);
    const result = await verifyWorkspaceSmtpConnection(cfg);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "SMTP test failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message || "SMTP connection successful." });
  } catch (err) {
    console.error("POST smtp test:", err);
    return NextResponse.json({ error: err.message || "SMTP test failed" }, { status: 500 });
  }
}
