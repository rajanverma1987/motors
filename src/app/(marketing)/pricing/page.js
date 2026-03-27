import Link from "next/link";
import Button from "@/components/ui/button";
import HeroBackground from "@/components/marketing/HeroBackground";
import PricingInquiryForm from "@/components/marketing/PricingInquiryForm";

export const metadata = {
  title: "Custom Pricing",
  description:
    "Pricing tailored to your workflow. Monthly, yearly, one-time, and hybrid models based on your process complexity.",
  openGraph: {
    title: "Custom Pricing | MotorsWinding.com",
    description: "Not a generic SaaS. Built around your workflow.",
  },
};

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-16 sm:py-20">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-title sm:text-5xl">
              Pricing tailored to your workflow
            </h1>
            <p className="mt-4 text-lg text-secondary">
              Every business is different. We analyze your process and offer the best pricing model - monthly, yearly, or one-time.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/contact">
                <Button variant="primary" size="sm">Book a Demo</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="sm">Get Pricing</Button>
              </Link>
            </div>
            <p className="mt-4 text-sm font-medium text-primary">
              Not a generic SaaS. Built around your workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
              <h2 className="text-xl font-semibold text-title">Available pricing models</h2>
              <ul className="mt-5 space-y-3 text-sm text-secondary">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Subscription (Monthly / Yearly)
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  One-time license (On-premise)
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  Hybrid (Setup + lower recurring)
                </li>
              </ul>
              <p className="mt-6 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-secondary">
                Optional anchor: <span className="font-medium text-title">Projects typically start from custom monthly tiers.</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-7 shadow-sm lg:col-span-2">
              <h2 className="text-xl font-semibold text-title">Tell us about your workflow</h2>
              <p className="mt-2 text-sm text-secondary">
                We use this to prepare the right demo and proposal.
              </p>
              <PricingInquiryForm sourcePage="/pricing" />
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-title">Reduce manual work</p>
              <p className="mt-2 text-sm text-secondary">Automate repetitive status updates, quote handoffs, and follow-up tasks across teams.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-title">Replace Excel dependency</p>
              <p className="mt-2 text-sm text-secondary">Move from spreadsheets and scattered chats to one controlled workflow with live visibility.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-title">Custom-fit to your process</p>
              <p className="mt-2 text-sm text-secondary">Configure around your floor, approvals, and billing model instead of forcing your team into generic templates.</p>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
