import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketplaceItem from "@/models/MarketplaceItem";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString, clampArray } from "@/lib/validation";
import { generateMarketplaceSlug, MARKETPLACE_CATEGORIES } from "@/lib/marketplace";

const CAT = new Set(MARKETPLACE_CATEGORIES.map((c) => c.value));

function toRow(doc) {
  const o = doc?.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    sellerType: o.sellerType,
    title: o.title || "",
    slug: o.slug || "",
    description: o.description || "",
    category: o.category || "other",
    priceDisplay: o.priceDisplay || "",
    condition: o.condition || "",
    images: Array.isArray(o.images) ? o.images : [],
    status: o.status || "draft",
    shopNameSnapshot: o.shopNameSnapshot || "",
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const list = await MarketplaceItem.find({
      sellerType: "shop",
      createdByEmail: email,
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return NextResponse.json(list.map((d) => toRow(d)));
  } catch (err) {
    console.error("Dashboard marketplace items GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
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
    const shopNameSnapshot = clampString(user.shopName || "", 300);

    await connectDB();
    let slug = generateMarketplaceSlug(title);
    for (let i = 0; i < 8; i++) {
      const exists = await MarketplaceItem.findOne({ slug }).lean();
      if (!exists) break;
      slug = generateMarketplaceSlug(title);
    }

    const doc = await MarketplaceItem.create({
      sellerType: "shop",
      createdByEmail: email,
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
    console.error("Dashboard marketplace items POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
