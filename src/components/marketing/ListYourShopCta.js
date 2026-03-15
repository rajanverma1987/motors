import Link from "next/link";
import Button from "@/components/ui/button";

/**
 * CTA for company-listing SEO pages: list your center + register.
 */
export default function ListYourShopCta() {
  return (
    <>
      <Link href="/list-your-electric-motor-services" className="block">
        <Button variant="primary" size="lg" className="w-full">
          List your center
        </Button>
      </Link>
      <Link href="/register" className="block">
        <Button variant="outline" size="lg" className="w-full">
          Create free account
        </Button>
      </Link>
      <p className="text-xs text-secondary mt-2">
        Get listed in our directory and receive qualified leads.
      </p>
    </>
  );
}
