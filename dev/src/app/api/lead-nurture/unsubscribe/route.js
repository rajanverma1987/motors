import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  normalizeLeadNurtureEmail,
  recordLeadNurtureOptOut,
  verifyLeadNurtureUnsubscribeToken,
} from "@/lib/lead-nurture";

async function handleUnsubscribe(request) {
  const baseUrl = getPublicSiteUrl(request);
  const successUrl = `${baseUrl}/unsubscribe/success`;
  try {
    const { searchParams } = new URL(request.url);
    const email = normalizeLeadNurtureEmail(searchParams.get("email"));
    const token = String(searchParams.get("token") || "");

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=missing`);
    }
    if (!verifyLeadNurtureUnsubscribeToken(email, token)) {
      return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=invalid`);
    }

    await recordLeadNurtureOptOut(email);
    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("Lead nurture unsubscribe error:", err);
    return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=1`);
  }
}

export function GET(request) {
  return handleUnsubscribe(request);
}

export async function POST(request) {
  return handleUnsubscribe(request);
}
