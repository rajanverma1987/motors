import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LocationPage from "@/models/LocationPage";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";

const LOCATION_PAGE_SORT_KEYS = ["slug", "title", "city", "state", "status"];

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: LOCATION_PAGE_SORT_KEYS,
      defaultKey: "slug",
      defaultDir: "asc",
    });
    const [totalCount, list] = await Promise.all([
      LocationPage.countDocuments({}),
      LocationPage.find({})
        .sort(mongoSortFromAdmin(sortBy, sortDir, { area: "city" }))
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);
    const data = list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    }));
    return NextResponse.json({ items: data, page, pageSize, totalCount });
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
