import Link from "next/link";
import Button from "@/components/ui/button";
import HeroBackground from "@/components/marketing/HeroBackground";

export const metadata = {
  title: "Thank you",
  description: "We received your demo request.",
};

export default function ContactThankYouPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-card py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/.08,transparent)]" aria-hidden />
        <HeroBackground />
        <div className="relative mx-auto max-w-[86.4rem] px-4 sm:px-6 text-center">
          <div className="mx-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            Message sent
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-title sm:text-5xl">
            Thanks for reaching out
          </h1>
          <p className="mx-auto mt-4 max-w-[43.2rem] text-lg text-secondary">
            We&apos;ve received your demo request and sent a confirmation to your email. Please reply with a few dates and times that work for you so we can schedule your demo.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link href="/" className="w-full min-w-0 sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto">
                Back to Home
              </Button>
            </Link>
            <Link href="/list-your-electric-motor-services" className="w-full min-w-0 sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                List your shop
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
