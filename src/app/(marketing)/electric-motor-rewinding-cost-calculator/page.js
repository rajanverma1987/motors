import HeroBackground from "@/components/marketing/HeroBackground";
import MotorRewindCostCalculator from "@/components/marketing/motor-rewind-cost-calculator";

const path = "/electric-motor-rewinding-cost-calculator";

export const metadata = {
  title: "Electric motor rewinding cost calculator (US ballpark) | MotorsWinding.com",
  description:
    "Free ballpark calculator for electric motor rewinding cost in the US. Enter HP or kW, voltage, RPM, and slots—then request quotes from shops in your area.",
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function ElectricMotorRewindingCostCalculatorPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-10 sm:py-14">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">Rewinding cost calculator</h1>
          <p className="mt-3 text-lg text-secondary">
            A quick, non-binding ballpark for homeowners and plant buyers—then connect with qualified winding shops
            near you.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <MotorRewindCostCalculator />
      </div>
    </>
  );
}
