import mongoose from "mongoose";
import Listing from "@/models/Listing";

const SHARED_LISTING_EMAIL = "contact@3phaseflow.com";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Platform directory database. Shop apps keep their own DB, so listings are not local. */
function platformMongoUri() {
  const explicit = String(process.env.PLATFORM_MONGODB_URI || "").trim();
  if (explicit) return explicit;
  const shop = String(process.env.MONGODB_URI || "").trim();
  if (!shop) return "";
  return shop.replace(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)[^/?]+/, "$1motors");
}

export function platformTenantIdentity() {
  return {
    slug: String(process.env.TENANT_SLUG || "").trim().toLowerCase(),
    ownerEmail: String(process.env.TENANT_OWNER_EMAIL || "").trim().toLowerCase(),
    companyName: String(process.env.COMPANY_NAME || "").trim(),
  };
}

export async function getPlatformListingModel() {
  const uri = platformMongoUri();
  if (!uri) throw new Error("Platform database is not configured");
  const g = globalThis;
  if (!g.__platformListingModel) {
    const conn = mongoose.createConnection(uri);
    g.__platformListingModel = conn
      .asPromise()
      .then((ready) => ready.models.Listing || ready.model("Listing", Listing.schema))
      .catch((err) => {
        g.__platformListingModel = null;
        throw err;
      });
  }
  return g.__platformListingModel;
}

async function stampTenantSlug(Model, doc, slug) {
  if (!doc || !slug) return doc;
  if (String(doc.tenantSlug || "").trim().toLowerCase() === slug) return doc;
  await Model.updateOne({ _id: doc._id }, { $set: { tenantSlug: slug } });
  return Model.findById(doc._id).lean();
}

/**
 * The shop's public directory row: slug, then owner email, then a unique company name.
 */
export async function findPlatformListingForTenant(Model, identity) {
  const slug = String(identity?.slug || "").trim().toLowerCase();
  const email = String(identity?.ownerEmail || "").trim().toLowerCase();
  const companyName = String(identity?.companyName || "").trim();

  if (slug) {
    const bySlug = await Model.findOne({ tenantSlug: slug }).sort({ updatedAt: -1 }).lean();
    if (bySlug) return bySlug;
  }

  if (email && email !== SHARED_LISTING_EMAIL) {
    const emailRe = new RegExp(`^${escapeRegex(email)}$`, "i");
    const byEmail = await Model.findOne({ email: emailRe }).sort({ updatedAt: -1 }).lean();
    if (byEmail) return stampTenantSlug(Model, byEmail, slug);
    const byNotify = await Model.findOne({ notificationEmails: emailRe })
      .sort({ updatedAt: -1 })
      .lean();
    if (byNotify) return stampTenantSlug(Model, byNotify, slug);
  }

  if (companyName) {
    const matches = await Model.find({
      companyName: new RegExp(`^${escapeRegex(companyName)}$`, "i"),
    })
      .sort({ updatedAt: -1 })
      .limit(2)
      .lean();
    if (matches.length === 1) return stampTenantSlug(Model, matches[0], slug);
  }

  return null;
}
