import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import JobApplication from "@/models/JobApplication";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { generateUniqueJobSlug } from "@/lib/job-posting-slug";
import { clampString, LIMITS } from "@/lib/validation";

function bodyFields(body) {
  return {
    title: clampString(body?.title, 300),
    description: typeof body?.description === "string" ? body.description.trim().slice(0, LIMITS.longText.max) : "",
    location: clampString(body?.location, LIMITS.shortText.max),
    department: clampString(body?.department, LIMITS.shortText.max),
    employmentType: ["full_time", "part_time", "contract", "temporary", "internship"].includes(body?.employmentType)
      ? body.employmentType
      : "full_time",
    experienceLevel: ["entry", "mid", "senior", "lead", "any"].includes(body?.experienceLevel)
      ? body.experienceLevel
      : "any",
    salaryDisplay: clampString(body?.salaryDisplay, LIMITS.shortText.max),
    responsibilities:
      typeof body?.responsibilities === "string"
        ? body.responsibilities.trim().slice(0, LIMITS.longText.max)
        : "",
    qualifications:
      typeof body?.qualifications === "string"
        ? body.qualifications.trim().slice(0, LIMITS.longText.max)
        : "",
    benefits: typeof body?.benefits === "string" ? body.benefits.trim().slice(0, LIMITS.longText.max) : "",
    status: ["draft", "open", "closed"].includes(body?.status) ? body.status : "draft",
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await JobPosting.find({ ownerEmail: email }).sort({ updatedAt: -1 }).lean();
    if (list.length === 0) {
      return NextResponse.json([]);
    }
    const ids = list.map((j) => j._id);
    const counts = await JobApplication.aggregate([
      { $match: { jobPostingId: { $in: ids }, ownerEmail: email } },
      { $group: { _id: "$jobPostingId", applicationCount: { $sum: 1 } } },
    ]);
    const countById = Object.fromEntries(counts.map((c) => [String(c._id), c.applicationCount]));
    return NextResponse.json(
      list.map((j) => ({
        ...j,
        id: j._id.toString(),
        _id: undefined,
        applicationCount: countById[String(j._id)] || 0,
      }))
    );
  } catch (err) {
    console.error("Dashboard job postings list error:", err);
    return NextResponse.json({ error: "Failed to list job postings" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const f = bodyFields(body);
    if (!f.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const slug = await generateUniqueJobSlug(f.title);
    const doc = await JobPosting.create({
      ownerEmail: email,
      slug,
      ...f,
      listedOnMarketingSite: body?.listedOnMarketingSite !== false,
    });
    return NextResponse.json({
      ok: true,
      job: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard job posting create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create" }, { status: 500 });
  }
}
