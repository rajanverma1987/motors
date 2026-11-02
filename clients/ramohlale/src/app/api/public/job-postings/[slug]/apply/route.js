import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import JobApplication from "@/models/JobApplication";
import User from "@/models/User";
import { checkRateLimit } from "@/lib/rate-limit";
import { getPublicJobPostingBySlug } from "@/lib/job-postings-public";
import { getTalentProfileFromRequest } from "@/lib/talent-auth";
import {
  sendShopNewApplicantEmail,
  sendTalentApplicationReceivedEmail,
  talentPublicProfileUrl,
} from "@/lib/talent-email";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "job-apply", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many applications. Try again later." }, { status: 429 });
  }
  try {
    const seeker = await getTalentProfileFromRequest(request);
    if (!seeker) {
      return NextResponse.json(
        { error: "Sign in with your talent profile email to apply." },
        { status: 401 }
      );
    }
    if (seeker.status === "banned") {
      return NextResponse.json({ error: "This account cannot apply." }, { status: 403 });
    }
    const applicantName = String(seeker.fullName || "").trim();
    const applicantEmail = String(seeker.email || "")
      .trim()
      .toLowerCase();
    if (!applicantName || !applicantEmail) {
      return NextResponse.json(
        { error: "Complete your name on your talent profile before applying." },
        { status: 400 }
      );
    }

    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const slug = params?.slug;
    const job = await getPublicJobPostingBySlug(slug);
    if (!job) {
      return NextResponse.json({ error: "This job is not accepting applications." }, { status: 404 });
    }

    await connectDB();
    const posting = await JobPosting.findOne({
      slug: String(slug).trim(),
      status: "open",
      listedOnMarketingSite: true,
    })
      .select("_id ownerEmail title")
      .lean();
    if (!posting) {
      return NextResponse.json({ error: "This job is not accepting applications." }, { status: 404 });
    }

    const existing = await JobApplication.findOne({
      jobPostingId: posting._id,
      seekerProfileId: seeker._id,
    })
      .select("_id")
      .lean();
    if (existing) {
      return NextResponse.json({ error: "You already applied to this job." }, { status: 409 });
    }

    const experienceText = [seeker.headline, seeker.bio].filter(Boolean).join("\n\n").slice(0, 8000);

    const doc = await JobApplication.create({
      jobPostingId: posting._id,
      ownerEmail: posting.ownerEmail,
      seekerProfileId: seeker._id,
      seekerSlug: seeker.slug || "",
      applicantName,
      applicantEmail,
      applicantPhone: seeker.phone || "",
      experienceText,
      resumeUrl: seeker.resumeUrl || "",
      status: "new",
    });

    const baseUrl = getPublicSiteUrl(request);
    const profileUrl = seeker.slug ? talentPublicProfileUrl(seeker.slug, request) : "";
    const dashboardUrl = `${baseUrl}/dashboards?tab=settings&section=job-postings`;

    void sendTalentApplicationReceivedEmail({
      to: applicantEmail,
      seekerName: applicantName,
      jobTitle: posting.title || job.title,
      shopName: job.shopName || "",
    });

    let shopTo = posting.ownerEmail;
    try {
      const owner = await User.findOne({ email: posting.ownerEmail }).select("email").lean();
      if (owner?.email) shopTo = owner.email;
    } catch {
      /* use ownerEmail */
    }
    void sendShopNewApplicantEmail({
      to: shopTo,
      jobTitle: posting.title || job.title,
      applicantName,
      applicantEmail,
      profileUrl,
      dashboardUrl,
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
