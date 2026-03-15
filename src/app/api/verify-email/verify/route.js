import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VerificationCode from "@/models/VerificationCode";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body?.email || "").trim().toLowerCase();
    const code = (body?.code || "").trim();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }

    await connectDB();
    const doc = await VerificationCode.findOne({ email, code });
    if (!doc) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }
    if (new Date() > doc.expiresAt) {
      await VerificationCode.deleteOne({ _id: doc._id });
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }
    await VerificationCode.deleteOne({ _id: doc._id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Verify email check error:", err);
    return NextResponse.json(
      { error: err.message || "Verification failed" },
      { status: 500 }
    );
  }
}
