import Link from "next/link";
import Button from "@/components/ui/button";
import HeroBackground from "@/components/marketing/HeroBackground";

export const metadata = {
  title: "Unsubscribed",
  description: "You have been unsubscribed from marketing emails.",
};

export default async function UnsubscribeSuccessPage({ searchParams }) {
  const params = searchParams && typeof searchParams.then === "function" ? await searchParams : searchParams || {};
  const error = params?.error;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-card to-card py-20 sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/.08,transparent)]" aria-hidden />
        <HeroBackground />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 text-center">
          {error ? (
            <>
              <div className="mx-auto inline-flex items-center justify-center rounded-full bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                Invalid link
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-title sm:text-5xl">
                Unsubscribe link invalid or expired
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-secondary">
                This unsubscribe link may be invalid or already used. If you still want to stop receiving emails, contact us and we&apos;ll remove you from the list.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                Unsubscribed
              </div>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-title sm:text-5xl">
                You&apos;re unsubscribed
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-secondary">
                You won&apos;t receive any more marketing emails from us. If you change your mind, you can list your shop or contact us anytime.
              </p>
            </>
          )}
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
