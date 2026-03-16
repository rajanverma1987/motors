import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketingContact from "@/models/MarketingContact";
import crypto from "crypto";

const UNSUB_SECRET = process.env.MARKETING_UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET;

function getUnsubscribeToken(email) {
  if (!UNSUB_SECRET) return null;
  const normalized = (email || "").trim().toLowerCase();
  return crypto.createHmac("sha256", UNSUB_SECRET).update(normalized).digest("base64url");
}

export function GET(request) {
  return handleUnsubscribe(request);
}

export async function handleUnsubscribe(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim()?.toLowerCase();
    const token = searchParams.get("token");
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com").replace(/\/$/, "");
    const successUrl = `${baseUrl}/unsubscribe/success`;

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=missing`);
    }
    if (UNSUB_SECRET && token !== getUnsubscribeToken(email)) {
      return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=invalid`);
    }

    await connectDB();
    const contact = await MarketingContact.findOne({ email });
    if (contact) {
      contact.status = "unsubscribed";
      await contact.save();
    }

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com").replace(/\/$/, "");
    return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=1`);
  }
}
