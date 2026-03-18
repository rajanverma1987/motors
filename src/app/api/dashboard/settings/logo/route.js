import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  saveShopSettingsLogo,
  removeShopSettingsLogoFiles,
} from "@/lib/shop-settings-logo";

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();
    const logoUrl = await saveShopSettingsLogo(email, file);
    await connectDB();
    const doc = await UserSettings.findOneAndUpdate(
      { ownerEmail: email },
      { $set: { "settings.logoUrl": logoUrl }, $setOnInsert: { ownerEmail: email } },
      { new: true, upsert: true }
    ).lean();
    const settings = mergeUserSettings(doc?.settings);
    return NextResponse.json({ ok: true, logoUrl, settings });
  } catch (err) {
    console.error("Shop logo upload:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    removeShopSettingsLogoFiles(email);
    await connectDB();
    const doc = await UserSettings.findOneAndUpdate(
      { ownerEmail: email },
      { $set: { "settings.logoUrl": "" } },
      { new: true, upsert: true }
    ).lean();
    const settings = mergeUserSettings(doc?.settings);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("Shop logo delete:", err);
    return NextResponse.json(
      { error: err.message || "Failed to remove logo" },
      { status: 500 }
    );
  }
}
