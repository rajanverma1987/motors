import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import JobApplication from "@/models/JobApplication";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { sendTalentApplicationStatusEmail, talentPublicProfileUrl } from "@/lib/talent-email";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const STATUS_LABELS = {
  new: "New",
  reviewed: "Reviewed",
  archived: "Archived",
};

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    const applicationId = params?.applicationId;
    if (!id || !applicationId || !mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(applicationId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const status = String(body?.status || "").trim();
    if (!["new", "reviewed", "archived"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await JobPosting.findOne({ _id: id, ownerEmail: email }).select("_id title").lean();
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const previous = await JobApplication.findOne({
      _id: applicationId,
      jobPostingId: job._id,
      ownerEmail: email,
    }).lean();
    if (!previous) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const doc = await JobApplication.findOneAndUpdate(
      { _id: applicationId, jobPostingId: job._id, ownerEmail: email },
      { $set: { status } },
      { new: true }
    ).lean();

    if (previous.status !== status && doc?.applicantEmail) {
      const baseUrl = getPublicSiteUrl(request);
      const profileUrl = doc.seekerSlug
        ? talentPublicProfileUrl(doc.seekerSlug, request)
        : `${baseUrl}/talent/profile`;
      void sendTalentApplicationStatusEmail({
        to: doc.applicantEmail,
        seekerName: doc.applicantName,
        jobTitle: job.title,
        statusLabel: STATUS_LABELS[status] || status,
        profileUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      application: {
        ...doc,
        id: String(doc._id),
        jobPostingId: String(doc.jobPostingId),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard application PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
