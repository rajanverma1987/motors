import PricingInquiryForm from "@/components/marketing/PricingInquiryForm";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/pricing",
  title: "Pricing — Motor Repair Shop Software",
  description:
    "Custom pricing for motor repair shop software. Monthly, yearly, or one-time options. Book a demo to get a quote tailored to your workflow.",
});

export default function PricingPage() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-title sm:text-5xl">Request pricing</h1>
          <p className="mt-4 text-lg text-secondary">
            IQMotorBase subscription pricing is customized for each shop. Share a few details and we will follow up
            with a quote.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <PricingInquiryForm sourcePage="/pricing" />
        </div>
      </div>
    </section>
  );
}
