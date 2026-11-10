import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VerificationCode from "@/models/VerificationCode";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { createTalentToken, serializeTalentProfile, talentCookieOptions } from "@/lib/talent-auth";
import { generateUniqueTalentSlug } from "@/lib/talent-slug";
import { getTalentUnsubscribeToken } from "@/lib/talent-unsubscribe";
import { computeTalentProfileScore } from "@/lib/talent-score";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";
import { TALENT_COOKIE, TALENT_VERIFY_PURPOSE } from "@/lib/talent-constants";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "talent-auth-verify", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(body?.code || "").trim();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    await connectDB();
    const doc = await VerificationCode.findOne({ email, code, purpose: TALENT_VERIFY_PURPOSE });
    if (!doc) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }
    if (new Date() > doc.expiresAt) {
      await VerificationCode.deleteOne({ _id: doc._id });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }
    await VerificationCode.deleteOne({ _id: doc._id });

    let profile = await JobSeekerProfile.findOne({ email });
    if (profile?.status === "banned") {
      return NextResponse.json({ error: "This account is not allowed to sign in." }, { status: 403 });
    }

    const now = new Date();
    if (!profile) {
      const slug = await generateUniqueTalentSlug("", email);
      profile = await JobSeekerProfile.create({
        email,
        emailVerifiedAt: now,
        slug,
        unsubscribeToken: getTalentUnsubscribeToken(email),
        profileScore: computeTalentProfileScore({}),
        status: "active",
        jobAlertsEnabled: true,
      });
    } else {
      profile.emailVerifiedAt = now;
      if (!profile.unsubscribeToken) {
        profile.unsubscribeToken = getTalentUnsubscribeToken(email);
      }
      if (profile.status === "paused") {
        // keep paused until they set active in profile
      }
      await profile.save();
    }

    const token = await createTalentToken(profile._id, email);
    const res = NextResponse.json({
      ok: true,
      profile: serializeTalentProfile(profile.toObject ? profile.toObject() : profile, {
        includePrivate: true,
      }),
    });
    res.cookies.set(TALENT_COOKIE, token, talentCookieOptions());
    return res;
  } catch (err) {
    console.error("Talent verify error:", err);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}
