import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { serializeTalentProfile } from "@/lib/talent-auth";
import { computeTalentProfileScore } from "@/lib/talent-score";
import { sendMarketingEmail } from "@/lib/email";
import { TALENT_STATUS, US_STATE_CODES } from "@/lib/talent-constants";
import { clampString, LIMITS } from "@/lib/validation";

export async function GET(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const doc = await JobSeekerProfile.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ profile: serializeTalentProfile(doc, { includePrivate: true }) });
  } catch (err) {
    console.error("Admin talent get error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    await connectDB();
    const current = await JobSeekerProfile.findById(id).lean();
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch = {};
    if (body.fullName != null) patch.fullName = clampString(body.fullName, LIMITS.name.max);
    if (body.phone != null) patch.phone = clampString(body.phone, 40);
    if (body.headline != null) patch.headline = clampString(body.headline, 160);
    if (body.bio != null) {
      patch.bio = typeof body.bio === "string" ? body.bio.trim().slice(0, LIMITS.longText.max) : "";
    }
    if (body.city != null) patch.city = clampString(body.city, 80);
    if (body.state != null) {
      const st = String(body.state || "")
        .trim()
        .toUpperCase();
      patch.state = US_STATE_CODES.includes(st) ? st : "";
    }
    if (body.status != null && TALENT_STATUS.includes(body.status)) patch.status = body.status;
    if (body.jobAlertsEnabled != null) patch.jobAlertsEnabled = Boolean(body.jobAlertsEnabled);
    if (body.availability != null) patch.availability = body.availability;

    const merged = { ...current, ...patch };
    patch.profileScore = computeTalentProfileScore(merged);

    const doc = await JobSeekerProfile.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();

    if (body.sendEmail && body.emailSubject && body.emailHtml && doc?.email) {
      await sendMarketingEmail(doc.email, String(body.emailSubject).slice(0, 200), String(body.emailHtml));
    }

    return NextResponse.json({
      ok: true,
      profile: serializeTalentProfile(doc, { includePrivate: true }),
    });
  } catch (err) {
    console.error("Admin talent PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
