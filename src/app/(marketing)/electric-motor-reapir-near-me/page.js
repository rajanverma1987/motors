import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import NearMeContent from "./near-me-content";

export const metadata = {
  title: "Electric Motor Repair Shops Near Me | Find Repair Centers by Location",
  description:
    "Find electric motor repair and rewinding shops near you. Use your location to see approved repair centers in your city, state, or zip code. Browse the directory of motor repair shops.",
  openGraph: {
    title: "Electric Motor Repair Shops Near Me | MotorsWinding.com",
    description:
      "Find motor repair centers near you. Use your location to see approved electric motor repair and rewinding shops in your area.",
  },
};

export default function NearMePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            Near you
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl lg:text-5xl">
            Electric motor repair shops near me
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-secondary">
            Use your location to find approved repair centers in your area. We&apos;ll show shops that serve your city, state, or zip code.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-secondary">
            Find electric motor repair, rewinding, and servicing near you. Allow location access to see centers in your area, or browse the full directory of listed repair shops.
          </p>
          <NearMeContent />
        </div>
      </section>
    </>
  );
}
