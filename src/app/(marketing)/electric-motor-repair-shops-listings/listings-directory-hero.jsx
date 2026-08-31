import HeroBackground from "@/components/marketing/HeroBackground";
import { LISTINGS_PAGE_CONTAINER } from "@/lib/listings-directory-layout";

export default function ListingsDirectoryHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
      <HeroBackground />
      <div className={`relative z-10 ${LISTINGS_PAGE_CONTAINER}`}>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          Directory
        </span>
        <h1 className="mt-4 text-balance break-words text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
          Find electric motor repair and rewinding shops
        </h1>
        <p className="mt-4 max-w-[50.4rem] text-pretty text-base text-secondary sm:text-lg">
          Browse industrial and commercial <strong className="text-title">electric motor repair and rewinding</strong>{" "}
          centers by city, state, or ZIP. Search this directory or submit your requirement and we&apos;ll match you with
          qualified shops in your area.
        </p>
      </div>
    </section>
  );
}
