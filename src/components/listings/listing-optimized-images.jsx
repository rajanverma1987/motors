import Image from "next/image";
import { getListingImageSrc, isRemoteImageUrl } from "@/lib/listing-image";

const CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
const HERO_SIZES = "(max-width: 1152px) 100vw, 1152px";
const GALLERY_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

/** Grid card hero: aspect-video, cover — uses Next Image for same-origin (smaller payloads). */
export function ListingCardImage({ src, priority = false }) {
  const normalized = getListingImageSrc(src);
  if (!normalized) return null;

  if (isRemoteImageUrl(normalized)) {
    return (
      <img
        src={normalized}
        alt=""
        className="h-full w-full object-cover object-center"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
      />
    );
  }

  return (
    <Image
      src={normalized}
      alt=""
      fill
      className="object-cover object-center"
      sizes={CARD_SIZES}
      priority={priority}
      quality={80}
    />
  );
}

/** Wide detail hero (gallery photo). */
export function ListingHeroImage({ src }) {
  const normalized = getListingImageSrc(src);
  if (!normalized) return null;

  if (isRemoteImageUrl(normalized)) {
    return (
      <img
        src={normalized}
        alt=""
        className="h-full w-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    );
  }

  return (
    <Image
      src={normalized}
      alt=""
      fill
      className="object-cover"
      sizes={HERO_SIZES}
      priority
      quality={82}
    />
  );
}

/** Small square next to the company name (header). */
export function ListingInlineLogo({ src }) {
  const normalized = getListingImageSrc(src);
  if (!normalized) return null;
  const cls =
    "h-20 w-20 rounded-lg border border-border object-contain bg-bg sm:h-24 sm:w-24";

  if (isRemoteImageUrl(normalized)) {
    return (
      <img
        src={normalized}
        alt=""
        className={cls}
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    );
  }

  return (
    <Image
      src={normalized}
      alt=""
      width={96}
      height={96}
      className={cls}
      sizes="96px"
      priority
      quality={88}
    />
  );
}

/** Directory grid card: small logo in a rounded rectangle (object-contain). */
export function ListingDirectoryCardLogo({ src, alt = "", priority = false }) {
  const normalized = getListingImageSrc(src);
  if (!normalized) return null;

  const inner = "max-h-full max-w-full object-contain object-center p-1.5";

  if (isRemoteImageUrl(normalized)) {
    return (
      <img
        src={normalized}
        alt={alt}
        className={inner}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "low"}
      />
    );
  }

  return (
    <Image
      src={normalized}
      alt={alt}
      width={64}
      height={64}
      className={inner}
      sizes="64px"
      priority={priority}
      quality={85}
    />
  );
}

/** Company logo block — bounded box, contain. */
export function ListingLogoImage({ src, alt = "Company logo" }) {
  const normalized = getListingImageSrc(src);
  if (!normalized) return null;

  if (isRemoteImageUrl(normalized)) {
    return (
      <img
        src={normalized}
        alt={alt}
        className="h-28 w-auto max-w-[200px] rounded-lg border border-border object-contain bg-bg p-2 sm:h-32"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <div className="relative h-28 w-[200px] max-w-full sm:h-32">
      <Image
        src={normalized}
        alt={alt}
        fill
        className="rounded-lg border border-border object-contain bg-bg p-2"
        sizes="200px"
        quality={88}
      />
    </div>
  );
}

/** Square gallery cell. */
export function ListingGalleryThumb({ src }) {
  const normalized = getListingImageSrc(src);
  if (!normalized) return null;

  if (isRemoteImageUrl(normalized)) {
    return (
      <img
        src={normalized}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={normalized}
      alt=""
      fill
      className="object-cover"
      sizes={GALLERY_SIZES}
      quality={78}
    />
  );
}
