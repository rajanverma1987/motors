import { NextResponse } from "next/server";
import { sendDemoRequestToAdmin, sendDemoRequestThankYou } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "contact-demo", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const name = clampString(body?.name, LIMITS.name.max);
    const email = (body?.email ?? "").trim().toLowerCase().slice(0, LIMITS.email.max);
    const phone = clampString(body?.phone, 30);
    const preferDate = clampString(body?.preferDate, 20);
    const preferTime = clampString(body?.preferTime, 20);
    const timezone = clampString(body?.timezone, 100);
    const businessName = clampString(body?.businessName, 200);
    const city = clampString(body?.city, 120);
    const state = clampString(body?.state, 80);
    const sourcePage = clampString(body?.sourcePage, 500);

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const fields = { name, email, phone, preferDate, preferTime, timezone, businessName, city, state, sourcePage };

    const adminResult = await sendDemoRequestToAdmin(fields);
    if (!adminResult.ok) {
      console.error("Demo request admin email failed:", adminResult.error);
      return NextResponse.json(
        { error: "Failed to send your request. Please try again or email us directly." },
        { status: 500 }
      );
    }

    const thankYouResult = await sendDemoRequestThankYou(name, email);
    if (!thankYouResult.ok) {
      console.warn("Demo request thank-you email failed:", thankYouResult.error);
      // Still return success; admin got the lead
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact demo error:", err);
    return NextResponse.json(
      { error: err.message || "Request failed" },
      { status: 500 }
    );
  }
}
