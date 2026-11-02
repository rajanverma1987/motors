import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VerificationCode from "@/models/VerificationCode";
import { sendTalentVerificationCodeEmail } from "@/lib/talent-email";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";
import { TALENT_VERIFY_PURPOSE } from "@/lib/talent-constants";

const CODE_EXPIRY_MINUTES = 15;

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "talent-auth-send", 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await connectDB();
    await VerificationCode.deleteMany({ email, purpose: TALENT_VERIFY_PURPOSE });
    await VerificationCode.create({ email, code, expiresAt, purpose: TALENT_VERIFY_PURPOSE });

    const result = await sendTalentVerificationCodeEmail(email, code);
    if (!result.ok) {
      console.error("Talent send code failed:", result.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Talent send-code error:", err);
    return NextResponse.json({ error: err.message || "Failed to send code" }, { status: 500 });
  }
}
