import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import JobApplication from "@/models/JobApplication";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { clampString } from "@/lib/validation";
import { LIMITS } from "@/lib/validation";

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
    const doc = await JobPosting.findOne({ _id: id, ownerEmail: email }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error("Dashboard job posting get error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
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
    const body = await request.json().catch(() => ({}));
    const f = bodyFields(body);
    if (!f.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const patch = { ...f };
    if (Object.prototype.hasOwnProperty.call(body, "listedOnMarketingSite")) {
      patch.listedOnMarketingSite = Boolean(body.listedOnMarketingSite);
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await JobPosting.findOneAndUpdate(
      { _id: id, ownerEmail: email },
      { $set: patch },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      job: {
        ...doc,
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard job posting patch error:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
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
    const result = await JobPosting.deleteOne({ _id: id, ownerEmail: email });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await JobApplication.deleteMany({ jobPostingId: new mongoose.Types.ObjectId(id) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Dashboard job posting delete error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
