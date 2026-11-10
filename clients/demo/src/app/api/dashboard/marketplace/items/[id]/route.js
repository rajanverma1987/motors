import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import MarketplaceItem from "@/models/MarketplaceItem";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString, clampArray } from "@/lib/validation";
import { MARKETPLACE_CATEGORIES } from "@/lib/marketplace";

const CAT = new Set(MARKETPLACE_CATEGORIES.map((c) => c.value));

function toRow(o) {
  const d = o?.toObject ? o.toObject() : o;
  return {
    id: String(d._id),
    sellerType: d.sellerType,
    title: d.title || "",
    slug: d.slug || "",
    description: d.description || "",
    category: d.category || "other",
    priceDisplay: d.priceDisplay || "",
    condition: d.condition || "",
    images: Array.isArray(d.images) ? d.images : [],
    status: d.status || "draft",
    shopNameSnapshot: d.shopNameSnapshot || "",
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function getParams(context) {
  return typeof context.params?.then === "function" ? context.params : Promise.resolve(context.params || {});
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const doc = await MarketplaceItem.findOne({
      _id: id,
      sellerType: "shop",
      createdByEmail: email,
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    if (body.title !== undefined) doc.title = clampString(body.title, 200) || doc.title;
    if (body.description !== undefined) doc.description = clampString(body.description, 8000);
    if (body.category !== undefined && CAT.has(body.category)) doc.category = body.category;
    if (body.priceDisplay !== undefined) doc.priceDisplay = clampString(body.priceDisplay, 80);
    if (body.condition !== undefined) doc.condition = clampString(body.condition, 100);
    if (body.images !== undefined) {
      doc.images = clampArray(body.images, 10).map((u) => clampString(u, LIMITS.url.max)).filter(Boolean);
    }
    if (body.status !== undefined) {
      doc.status = body.status === "published" ? "published" : "draft";
    }
    if (user.shopName) doc.shopNameSnapshot = clampString(user.shopName, 300);
    await doc.save();
    return NextResponse.json({ ok: true, item: toRow(doc) });
  } catch (err) {
    console.error("Dashboard marketplace item PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const r = await MarketplaceItem.deleteOne({
      _id: id,
      sellerType: "shop",
      createdByEmail: email,
    });
    if (r.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Dashboard marketplace item DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
