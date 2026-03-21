import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import JobApplication from "@/models/JobApplication";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const job = await JobPosting.findOne({ _id: id, ownerEmail: email }).select("_id").lean();
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const apps = await JobApplication.find({ jobPostingId: job._id })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(
      apps.map((a) => ({
        ...a,
        id: a._id.toString(),
        jobPostingId: String(a.jobPostingId),
        _id: undefined,
      }))
    );
  } catch (err) {
    console.error("Dashboard job applications list error:", err);
    return NextResponse.json({ error: "Failed to list applications" }, { status: 500 });
  }
}
