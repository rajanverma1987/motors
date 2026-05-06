import Link from "next/link";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import { ListingDirectoryCardLogo } from "@/components/listings/listing-optimized-images";

export default function PublicListingCard({ listing, imagePriority = false }) {
  const location = [listing.city, listing.state].filter(Boolean).join(", ");
  const logoUrl = listing.logoUrl?.trim();
  const firstPhoto =
    Array.isArray(listing.galleryPhotoUrls) && listing.galleryPhotoUrls[0] ? listing.galleryPhotoUrls[0] : null;
  const thumbUrl =
    logoUrl ||
    (firstPhoto?.startsWith("http") ? firstPhoto : firstPhoto?.startsWith("/") ? firstPhoto : firstPhoto ? `/${firstPhoto}` : null);
  const slug = getListingPublicPathSegment(listing);
  const company = listing.companyName || "Repair center";
  const initial = (company.trim().charAt(0) || "?").toUpperCase();

  return (
    <Link
      href={`/electric-motor-reapir-shops-listings/${slug}`}
      prefetch
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:border-primary/30 hover:shadow-lg"
    >
      <div className="flex min-h-0 flex-1 gap-4 p-4 sm:p-5">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 sm:h-16 sm:w-16"
          aria-hidden={!thumbUrl}
        >
          {thumbUrl ? (
            <ListingDirectoryCardLogo src={thumbUrl} alt="" priority={imagePriority} />
          ) : (
            <span className="text-lg font-bold text-primary sm:text-xl">{initial}</span>
          )}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <h2 className="text-lg font-semibold leading-snug text-title">{company}</h2>
          {location && <p className="mt-1 text-sm text-secondary">{location}</p>}
          {listing.shortDescription && (
            <p className="mt-2 line-clamp-3 text-sm text-secondary">{listing.shortDescription}</p>
          )}
          <span className="mt-3 inline-flex items-center text-sm font-medium text-primary sm:mt-auto sm:pt-2">
            View Capacity and Capabilities →
          </span>
        </div>
      </div>
    </Link>
  );
}
