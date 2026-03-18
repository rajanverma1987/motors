import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { randomBytes } from "crypto";

async function uniqueToken(excludeOwnerEmail) {
  for (let i = 0; i < 8; i++) {
    const token = randomBytes(24).toString("hex");
    const clash = await UserSettings.findOne({
      "settings.jobBoardToken": token,
      ...(excludeOwnerEmail ? { ownerEmail: { $ne: excludeOwnerEmail } } : {}),
    }).lean();
    if (!clash) return token;
  }
  return randomBytes(24).toString("hex");
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    let doc = await UserSettings.findOne({ ownerEmail: email });
    let token;

    if (!doc) {
      token = await uniqueToken(null);
      await UserSettings.create({
        ownerEmail: email,
        settings: { jobBoardToken: token },
      });
    } else {
      const existing = doc.settings?.jobBoardToken;
      if (typeof existing === "string" && existing.trim()) {
        token = existing.trim();
      } else {
        token = await uniqueToken(email);
        await UserSettings.updateOne(
          { ownerEmail: email },
          { $set: { "settings.jobBoardToken": token } }
        );
      }
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const url = `${baseUrl}/job-board?token=${encodeURIComponent(token)}`;
    return NextResponse.json({ url, token });
  } catch (err) {
    console.error("Dashboard job board link error:", err);
    return NextResponse.json({ error: "Failed to get job board link" }, { status: 500 });
  }
}
