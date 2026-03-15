import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LocationPage from "@/models/LocationPage";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const list = await LocationPage.find({})
      .sort({ slug: 1 })
      .lean();
    const data = list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json(data);
  } catch (err) {
    console.error("Location pages list error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const slug = (body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }
    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    await connectDB();
    const existing = await LocationPage.findOne({ slug }).lean();
    if (existing) {
      return NextResponse.json({ error: "A location page with this slug already exists" }, { status: 400 });
    }
    const doc = await LocationPage.create({
      slug,
      title,
      metaDescription: (body.metaDescription || "").trim(),
      city: (body.city || "").trim(),
      state: (body.state || "").trim(),
      zip: (body.zip || "").trim(),
      status: body.status === "draft" ? "draft" : "active",
    });
    return NextResponse.json({
      ...doc.toObject(),
      id: doc._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error("Location page create error:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
