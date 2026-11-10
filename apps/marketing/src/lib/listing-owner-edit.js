import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { resolvePublicListingFromSlugParam } from "@/lib/listings-public";
import { getListingNotifyEmailsIncludingCrmLogin } from "@/lib/listing-notify-emails";
import { listingDocumentToFormData } from "@/lib/directory-listing-constants";

export const LISTING_OWNER_EDIT_PURPOSE = "listing-owner-edit";

export async function loadApprovedListingBySlug(slug) {
  const { listing } = await resolvePublicListingFromSlugParam(slug);
  if (!listing?.id) return null;
  await connectDB();
  return Listing.findOne({ _id: listing.id, status: "approved" });
}

export async function emailOwnsListing(listing, email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized || !listing) return false;
  const emails = await getListingNotifyEmailsIncludingCrmLogin(listing);
  return emails.includes(normalized);
}

export function serializeOwnerListing(doc) {
  const plain = typeof doc?.toObject === "function" ? doc.toObject() : { ...doc };
  const id = plain._id?.toString?.() || plain.id || "";
  return {
    id,
    status: plain.status || "",
    urlSlug: String(plain.urlSlug || "").trim(),
    companyName: String(plain.companyName || ""),
    logoUrl: String(plain.logoUrl || ""),
    galleryPhotoUrls: Array.isArray(plain.galleryPhotoUrls)
      ? plain.galleryPhotoUrls.map((url) => String(url || "")).filter(Boolean)
      : [],
    form: listingDocumentToFormData(plain),
  };
}
