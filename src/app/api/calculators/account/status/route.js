import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Check if email already has a portal account (calculators subscribe flow). */
export async function POST(request) {
  const { allowed } = checkRateLimit(request, "calc-account-status", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    await connectDB();
    const user = await User.findOne({ email }).select("_id").lean();
    return NextResponse.json({ portalAccountExists: !!user });
  } catch (err) {
    console.error("calculators/account/status:", err);
    return NextResponse.json({ error: "Could not check account status" }, { status: 500 });
  }
}
