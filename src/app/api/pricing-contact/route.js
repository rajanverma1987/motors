import { NextResponse } from "next/server";
import { sendDemoRequestToAdmin, sendDemoRequestThankYou } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "pricing-contact", 10);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const name = clampString(body?.name, LIMITS.name.max);
    const email = (body?.email ?? "").trim().toLowerCase().slice(0, LIMITS.email.max);
    const phone = clampString(body?.phone, 30);
    const message = clampString(body?.message, 2000);
    const requestType = body?.requestType === "founder" ? "founder" : "general";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required." },
        { status: 400 }
      );
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "A valid email is required." },
        { status: 400 }
      );
    }

    const sourcePage =
      requestType === "founder" ? "/pricing (founder pricing request)" : "/pricing (general inquiry)";

    const adminResult = await sendDemoRequestToAdmin({
      name,
      email,
      phone,
      mainProblem: message,
      sourcePage,
    });

    if (!adminResult.ok) {
      console.error("Pricing contact admin email failed:", adminResult.error);
      return NextResponse.json(
        { success: false, message: "Unable to process. Please try again." },
        { status: 502 }
      );
    }

    const thankYouResult = await sendDemoRequestThankYou(name, email, {});
    if (!thankYouResult.ok) {
      console.warn("Pricing contact thank-you email failed:", thankYouResult.error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Pricing contact error:", err);
    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
