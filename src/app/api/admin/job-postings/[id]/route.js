import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { clampString, LIMITS } from "@/lib/validation";

function bodyFields(body) {
  return {
    title: clampString(body?.title, 300),
    description:
      typeof body?.description === "string" ? body.description.trim().slice(0, LIMITS.longText.max) : "",
    location: clampString(body?.location, LIMITS.shortText.max),
    department: clampString(body?.department, LIMITS.shortText.max),
    employmentType: ["full_time", "part_time", "contract", "temporary", "internship"].includes(
      body?.employmentType
    )
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

export async function PATCH(request, { params }) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolved = typeof params?.then === "function" ? await params : params ?? {};
    const id = String(resolved?.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const f = bodyFields(body);
    if (!f.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await connectDB();
    const doc = await JobPosting.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
    }

    Object.assign(doc, f);
    if (body?.listedOnMarketingSite !== undefined) {
      doc.listedOnMarketingSite = body.listedOnMarketingSite !== false;
    }
    await doc.save();

    return NextResponse.json({
      ok: true,
      job: { ...doc.toObject(), id: doc._id.toString(), _id: undefined },
    });
  } catch (err) {
    console.error("Admin job posting PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolved = typeof params?.then === "function" ? await params : params ?? {};
    const id = String(resolved?.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await connectDB();
    const deleted = await JobPosting.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin job posting DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
