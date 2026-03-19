import Link from "next/link";
import Button from "@/components/ui/button";
import HeroBackground from "@/components/marketing/HeroBackground";

export const metadata = {
  title: "Pricing",
  description:
    "Plans and pricing for motor repair center software, shop parts inventory, lead generation, and marketplace listings. Starter, Professional, and Enterprise. Contact for demo.",
  openGraph: {
    title: "Pricing | MotorsWinding.com",
    description: "Plans and pricing for motor repair center software and lead generation.",
  },
};

const plans = [
  {
    name: "Starter",
    description: "For small centers getting started",
    price: "Contact",
    period: "for pricing",
    features: [
      "Work orders & job board",
      "Customer & motor registry",
      "Quotes & basic invoicing",
      "Up to 3 users",
    ],
    cta: "Contact for demo",
    href: "/contact",
    highlighted: false,
  },
  {
    name: "Professional",
    description: "Full Job management + leads",
    price: "Custom",
    period: "per month",
    features: [
      "Everything in Starter",
      "Lead generation network",
      "Public marketplace listings",
      "Vendor & PO management",
      "Shop parts inventory & low-stock alerts",
      "Receiving & shipping",
      "Reports & analytics",
      "Unlimited users",
    ],
    cta: "Contact for demo",
    href: "/contact",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For multi-location or custom needs",
    price: "Custom",
    period: "",
    features: [
      "Everything in Professional",
      "Dedicated support",
      "Custom integrations",
      "SLA & training",
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-16 sm:py-20">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-title sm:text-5xl">
              Pricing
            </h1>
            <p className="mt-4 text-lg text-secondary">
              Simple plans for repair centers. Lead credits and add-ons available.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${plan.highlighted
                    ? "border-primary bg-card shadow-lg ring-1 ring-primary/20"
                    : "border-border bg-card"
                  }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-white">
                    Popular
                  </span>
                )}
                <h2 className="text-xl font-semibold text-title">{plan.name}</h2>
                <p className="mt-1 text-sm text-secondary">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-title">{plan.price}</span>
                  {plan.period && (
                    <span className="text-secondary">{plan.period}</span>
                  )}
                </div>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-secondary">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href={plan.href}>
                    <Button
                      variant={plan.highlighted ? "primary" : "outline"}
                      size="lg"
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-secondary">
            Lead credits are billed separately based on usage. Contact us for a custom quote.
          </p>
          <div className="mt-6">
            <Link href="/contact">
              <Button variant="outline">Contact Us</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
