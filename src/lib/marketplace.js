import crypto from "crypto";
import { connectDB } from "@/lib/db";
import MarketplaceItem from "@/models/MarketplaceItem";

export const MARKETPLACE_CATEGORIES = [
  { value: "parts", label: "Parts & components" },
  { value: "motors", label: "Motors & drives" },
  { value: "tools", label: "Tools & equipment" },
  { value: "surplus", label: "Surplus / used" },
  { value: "other", label: "Other" },
];

export function categoryLabel(value) {
  return MARKETPLACE_CATEGORIES.find((c) => c.value === value)?.label || "Other";
}

function slugifyBase(title) {
  const s = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return s || "item";
}

export function generateMarketplaceSlug(title) {
  return `${slugifyBase(title)}-${crypto.randomBytes(3).toString("hex")}`;
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getPublishedMarketplaceItems({ q, category, limit = 120 } = {}) {
  await connectDB();
  const query = { status: "published" };
  if (category && category !== "all" && MARKETPLACE_CATEGORIES.some((c) => c.value === category)) {
    query.category = category;
  }
  if (q && String(q).trim().length >= 2) {
    const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 80)), "i");
    query.$or = [{ title: rx }, { description: rx }, { priceDisplay: rx }, { shopNameSnapshot: rx }];
  }
  const list = await MarketplaceItem.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  return list;
}

export async function getPublishedItemBySlug(slug) {
  if (!slug || typeof slug !== "string") return null;
  await connectDB();
  const doc = await MarketplaceItem.findOne({
    slug: slug.trim(),
    status: "published",
  }).lean();
  return doc;
}

export async function getAllPublishedSlugs() {
  await connectDB();
  const rows = await MarketplaceItem.find({ status: "published" }).select("slug").lean();
  return rows.map((r) => r.slug).filter(Boolean);
}
