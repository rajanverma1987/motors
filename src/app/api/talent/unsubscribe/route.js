import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { verifyTalentUnsubscribeToken } from "@/lib/talent-unsubscribe";

export async function GET(request) {
  return handleUnsubscribe(request);
}

export async function POST(request) {
  return handleUnsubscribe(request);
}

async function handleUnsubscribe(request) {
  try {
    const { searchParams } = new URL(request.url);
    let email = searchParams.get("email")?.trim()?.toLowerCase();
    let token = searchParams.get("token");
    if ((!email || !token) && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      email = String(body?.email || email || "")
        .trim()
        .toLowerCase();
      token = String(body?.token || token || "");
    }
    const baseUrl = getPublicSiteUrl(request);
    const successUrl = `${baseUrl}/talent/unsubscribe?ok=1`;
    const errorUrl = `${baseUrl}/talent/unsubscribe?error=1`;

    if (!email || !verifyTalentUnsubscribeToken(email, token)) {
      return NextResponse.redirect(errorUrl);
    }

    await connectDB();
    await JobSeekerProfile.updateOne(
      { email },
      { $set: { jobAlertsEnabled: false } }
    );

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("Talent unsubscribe error:", err);
    const baseUrl = getPublicSiteUrl(request);
    return NextResponse.redirect(`${baseUrl}/talent/unsubscribe?error=1`);
  }
}
