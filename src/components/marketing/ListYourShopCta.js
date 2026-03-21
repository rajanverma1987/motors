import Link from "next/link";

const btnPrimary =
  "inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-lg text-white transition-opacity hover:opacity-90";
const btnOutline =
  "inline-flex w-full items-center justify-center rounded-md border-[0.5px] border-border bg-transparent px-6 py-3 text-lg text-text transition-opacity hover:bg-card hover:border-primary/20";

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
