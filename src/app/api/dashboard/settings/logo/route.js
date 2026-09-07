import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  saveShopSettingsLogo,
  removeShopSettingsLogoFiles,
  shopSettingsLogoAbsolutePath,
  normalizeShopSettingsLogoPath,
} from "@/lib/shop-settings-logo";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Stream the current shop logo for authenticated preview (bypasses stale /uploads cache on tablets).
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const doc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const settings = mergeUserSettings(doc?.settings);
    const logoUrl = String(settings.logoUrl || "").trim();
    const filePath = shopSettingsLogoAbsolutePath(email, logoUrl);
    if (!filePath) {
      return new NextResponse(null, { status: 404 });
    }
    let buffer;
    try {
      buffer = readFileSync(filePath);
    } catch {
      return new NextResponse(null, { status: 404 });
    }
    if (!buffer?.length) {
      return new NextResponse(null, { status: 404 });
    }
    const ext = path.extname(normalizeShopSettingsLogoPath(logoUrl)).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "image/png";
    const revision = path.basename(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-cache, must-revalidate",
        "Content-Disposition": `inline; filename="${revision}"`,
      },
    });
  } catch (err) {
    console.error("Shop logo GET:", err);
    return NextResponse.json({ error: err.message || "Failed to load logo" }, { status: 500 });
  }
}

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
      { new: true }
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
