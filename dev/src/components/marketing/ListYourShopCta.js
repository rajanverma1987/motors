import Link from "next/link";

const btnPrimary =
  "inline-flex w-full min-w-0 max-w-full items-center justify-center whitespace-normal text-center text-pretty rounded-md bg-primary px-4 py-2.5 text-base text-white transition-opacity hover:opacity-90 sm:px-6 sm:py-3 sm:text-lg";
const btnOutline =
  "inline-flex w-full min-w-0 max-w-full items-center justify-center whitespace-normal text-center text-pretty rounded-md border-[0.5px] border-border bg-transparent px-4 py-2.5 text-base text-text transition-opacity hover:bg-card hover:border-primary/20 sm:px-6 sm:py-3 sm:text-lg";

/**
 * CTA for company-listing SEO pages: list your center + register.
 * Uses styled links (not &lt;a&gt;&lt;button&gt;) for valid HTML and stable hydration.
 */
export default function ListYourShopCta() {
  return (
    <>
      <Link href="/list-your-electric-motor-services" className={btnPrimary}>
        List your center
      </Link>
      <Link href="/register" className={btnOutline}>
        Create free account
      </Link>
      <p className="text-xs text-secondary mt-2">
        Get listed in our directory and receive qualified leads.
      </p>
    </>
  );
}
