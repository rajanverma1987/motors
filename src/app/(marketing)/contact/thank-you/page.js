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
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <div className="mx-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            Message sent
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-title sm:text-5xl">
            Thanks for reaching out
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-secondary">
            We&apos;ve received your demo request and sent a confirmation to your email. We&apos;ll get back to you within 1–2 business days to schedule a time that works for you.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
            <Link href="/list-your-electric-motor-services">
              <Button variant="outline">List your shop</Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
