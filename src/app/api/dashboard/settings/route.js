import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  mergeUserSettings,
  sanitizeUserSettingsPatch,
} from "@/lib/user-settings";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const settings = mergeUserSettings(doc?.settings);
    return NextResponse.json({
      settings,
      ownerEmail: email,
    });
  } catch (err) {
    console.error("GET dashboard settings:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const patch = sanitizeUserSettingsPatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid settings to update" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await UserSettings.findOneAndUpdate(
      { ownerEmail: email },
      {
        $set: Object.fromEntries(
          Object.entries(patch).map(([k, v]) => [`settings.${k}`, v])
        ),
        $setOnInsert: { ownerEmail: email },
      },
      { new: true, upsert: true }
    ).lean();

    const settings = mergeUserSettings(doc?.settings);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("PATCH dashboard settings:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
