import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import JobApplication from "@/models/JobApplication";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { getPublicJobPostingBySlug } from "@/lib/job-postings-public";

export async function POST(request, context) {
  const { allowed } = checkRateLimit(request, "job-apply", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many applications. Try again later." }, { status: 429 });
  }
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const slug = params?.slug;
    const job = await getPublicJobPostingBySlug(slug);
    if (!job) {
      return NextResponse.json({ error: "This job is not accepting applications." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const applicantName = clampString(body?.applicantName, LIMITS.name.max);
    const applicantEmail = String(body?.applicantEmail || "")
      .trim()
      .toLowerCase()
      .slice(0, LIMITS.email.max);
    const applicantPhone = clampString(body?.applicantPhone, 40);
    const experienceText =
      typeof body?.experienceText === "string" ? body.experienceText.trim().slice(0, LIMITS.longText.max) : "";

    if (!applicantName || !applicantEmail) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!isValidEmail(applicantEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!experienceText || experienceText.length < 20) {
      return NextResponse.json(
        { error: "Please enter a short description of your experience (at least 20 characters)." },
        { status: 400 }
      );
    }

    await connectDB();
    const posting = await JobPosting.findOne({
      slug: String(slug).trim(),
      status: "open",
      listedOnMarketingSite: true,
    })
      .select("_id ownerEmail")
      .lean();
    if (!posting) {
      return NextResponse.json({ error: "This job is not accepting applications." }, { status: 404 });
    }

    const doc = await JobApplication.create({
      jobPostingId: posting._id,
      ownerEmail: posting.ownerEmail,
      applicantName,
      applicantEmail,
      applicantPhone,
      experienceText,
      status: "new",
    });

    return NextResponse.json({
      ok: true,
      id: doc._id.toString(),
    });
  } catch (err) {
    console.error("Job application error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit application" }, { status: 500 });
  }
}
