import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketplaceItem from "@/models/MarketplaceItem";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { LIMITS, clampString, clampArray } from "@/lib/validation";
import { generateMarketplaceSlug, MARKETPLACE_CATEGORIES } from "@/lib/marketplace";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";

const MARKETPLACE_ITEM_SORT_KEYS = ["title", "shopNameSnapshot", "category", "priceDisplay", "status", "slug", "createdAt"];

const CAT = new Set(MARKETPLACE_CATEGORIES.map((c) => c.value));
const PLATFORM_EMAIL = "platform@marketplace.internal";

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
      allowedKeys: MARKETPLACE_ITEM_SORT_KEYS,
      defaultKey: "createdAt",
      defaultDir: "desc",
    });
    const q = { sellerType: "platform" };
    const [totalCount, list] = await Promise.all([
      MarketplaceItem.countDocuments(q),
      MarketplaceItem.find(q)
        .sort(mongoSortFromAdmin(sortBy, sortDir))
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);
    return NextResponse.json({ items: list.map((d) => toRow(d)), page, pageSize, totalCount });
  } catch (err) {
    console.error("Admin marketplace items GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const title = clampString(body?.title, 200);
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const description = clampString(body?.description, 8000);
    const category = CAT.has(body?.category) ? body.category : "other";
    const priceDisplay = clampString(body?.priceDisplay, 80);
    const condition = clampString(body?.condition, 100);
    const images = clampArray(body?.images, 10).map((u) => clampString(u, LIMITS.url.max)).filter(Boolean);
    const status = body?.status === "published" ? "published" : "draft";
    const shopNameSnapshot = clampString(body?.shopNameSnapshot || "IQMotorBase.com", 300);

    await connectDB();
    let slug = generateMarketplaceSlug(title);
    for (let i = 0; i < 8; i++) {
      const exists = await MarketplaceItem.findOne({ slug }).lean();
      if (!exists) break;
      slug = generateMarketplaceSlug(title);
    }

    const doc = await MarketplaceItem.create({
      sellerType: "platform",
      createdByEmail: PLATFORM_EMAIL,
      shopNameSnapshot,
      title,
      slug,
      description,
      category,
      priceDisplay,
      condition,
      images,
      status,
    });
    return NextResponse.json({ ok: true, item: toRow(doc) });
  } catch (err) {
    console.error("Admin marketplace items POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
