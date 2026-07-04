import Link from "next/link";
import Badge from "@/components/ui/badge";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import { ListingDirectoryCardLogo } from "@/components/listings/listing-optimized-images";

/**
 * @param {{ listing: object, imagePriority?: boolean, locationMatchType?: "based-in"|"serves"|null }} props
 */
export default function PublicListingCard({ listing, imagePriority = false, locationMatchType = null }) {
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
      href={`/electric-motor-repair-shops-listings/${slug}`}
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
          <div className="flex flex-wrap items-start gap-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-title">{company}</h2>
            {locationMatchType === "based-in" ? (
              <Badge variant="success" className="shrink-0 rounded-full px-2 py-0.5 text-[10px]">
                Based in area
              </Badge>
            ) : locationMatchType === "serves" ? (
              <Badge variant="default" className="shrink-0 rounded-full px-2 py-0.5 text-[10px]">
                Serves area
              </Badge>
            ) : null}
          </div>
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
