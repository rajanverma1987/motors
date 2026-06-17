import PricingInquiryForm from "@/components/marketing/PricingInquiryForm";

export const metadata = {
  title: "Request pricing",
  description:
    "Request IQMotorBase CRM pricing for your motor repair shop. Tell us about your team and workflow and we will send a proposal.",
  openGraph: {
    title: "Request pricing | IQMotorBase.com",
    description: "Request custom pricing for motor repair shop management software.",
  },
};

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
