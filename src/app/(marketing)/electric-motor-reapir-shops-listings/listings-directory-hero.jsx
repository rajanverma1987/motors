import HeroBackground from "@/components/marketing/HeroBackground";
import ListingsHeroCta from "./listings-hero-cta";

export default function ListingsDirectoryHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
      <HeroBackground />
      <div className="relative z-10 mx-auto max-w-[86.4rem] px-4 sm:px-6">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          Directory
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
          Find a motor repair center
        </h1>
        <p className="mt-4 max-w-[50.4rem] text-lg text-secondary">
          Browse approved repair centers by location. Submit your requirement and we&apos;ll match you with repair
          centers in your area.
        </p>
        <ListingsHeroCta />
      </div>
    </section>
  );
}
