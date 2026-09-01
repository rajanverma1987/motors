import Link from "next/link";
import Badge from "@/components/ui/badge";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import { PREMIUM_LISTING_BADGE_LABEL } from "@/lib/listing-premium";
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
  const isPremium = !!listing.isPremium;

  return (
    <Link
      href={`/electric-motor-repair-shops-listings/${slug}`}
      prefetch
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:border-primary/30 hover:shadow-lg ${
        isPremium ? "border-warning/40 ring-1 ring-warning/20" : "border-border"
      }`}
    >
      <div className="flex min-h-0 flex-1 gap-5 p-5 sm:gap-6 sm:p-6">
        <div
          className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 sm:h-[4.5rem] sm:w-[4.5rem]"
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
            <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-title sm:text-xl">{company}</h2>
            {isPremium ? (
              <Badge variant="warning" className="shrink-0 rounded-full px-2.5 py-0.5 text-xs">
                {PREMIUM_LISTING_BADGE_LABEL}
              </Badge>
            ) : null}
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
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-secondary sm:text-[0.9375rem]">
              {listing.shortDescription}
            </p>
          )}
          <span className="mt-3 inline-flex items-center text-sm font-medium text-primary sm:mt-auto sm:pt-2">
            View Capacity and Capabilities →
          </span>
        </div>
      </div>
    </Link>
  );
}
