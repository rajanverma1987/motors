import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import LocationPage from "@/models/LocationPage";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function GET(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await LocationPage.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...doc,
      id: doc._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error("Location page get error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const body = await request.json();
    await connectDB();
    const doc = await LocationPage.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (body.slug !== undefined) {
      const slug = (body.slug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (slug) doc.slug = slug;
    }
    if (body.title !== undefined) doc.title = (body.title || "").trim();
    if (body.metaDescription !== undefined) doc.metaDescription = (body.metaDescription || "").trim();
    if (body.city !== undefined) doc.city = (body.city || "").trim();
    if (body.state !== undefined) doc.state = (body.state || "").trim();
    if (body.zip !== undefined) doc.zip = (body.zip || "").trim();
    if (body.status !== undefined) doc.status = body.status === "draft" ? "draft" : "active";
    await doc.save();
    const out = doc.toObject();
    return NextResponse.json({
      ...out,
      id: out._id.toString(),
      _id: undefined,
    });
  } catch (err) {
    console.error("Location page update error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await LocationPage.findByIdAndDelete(id);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Location page delete error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
