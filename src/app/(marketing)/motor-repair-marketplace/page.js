import Link from "next/link";
import Button from "@/components/ui/button";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export async function generateMetadata() {
  const base = getPublicSiteUrl();
  const title = "Motor repair marketplace for your shop — list parts & equipment | MotorsWinding.com";
  const description =
    "Sell spare parts, surplus motors, and tools on our public marketplace from your CRM—separate from internal shop inventory for jobs. Reach buyers without handling payments on the site—we help you grow with lead-style orders and optional platform listings.";
  return {
    title,
    description,
    alternates: { canonical: `${base}/motor-repair-marketplace` },
    openGraph: {
      title,
      description,
      url: `${base}/motor-repair-marketplace`,
      siteName: "MotorsWinding.com",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function MotorRepairMarketplaceMarketingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-border bg-gradient-to-b from-primary/[0.06] to-card">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
            Turn inventory into opportunities with the marketplace
          </h1>
          <p className="mt-4 text-lg text-secondary">
            MotorsWinding.com runs a <strong className="text-title">public marketplace</strong> where visitors search
            and filter listings. Your repair center can publish items from the same CRM you already use for work orders
            and quotes—buyers submit a <strong className="text-title">request</strong>, not an online payment, and you
            close the deal on your terms.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/register">
              <Button variant="primary" size="lg">
                Get CRM access
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="lg">
                Browse live listings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-semibold text-title">Why shops use it</h2>
        <ul className="mt-4 list-inside list-disc space-y-3 text-secondary">
          <li>
            <strong className="text-title">Not the same as job-stock inventory</strong> — Your{" "}
            <strong className="text-title">shop parts catalog</strong> (on-hand, reserved for work orders, receiving
            from vendor POs) lives under <strong className="text-title">Inventory</strong> in the dashboard. The
            marketplace is for <strong className="text-title">public listings</strong> you choose to promote to buyers.
          </li>
          <li>
            <strong className="text-title">List from the CRM</strong> — Add title, description, category, price note,
            and image URLs. Publish when ready; drafts stay private.
          </li>
          <li>
            <strong className="text-title">SEO-friendly pages</strong> — Each listing has its own URL, meta tags, and
            Open Graph data so search and social sharing work in your favor.
          </li>
          <li>
            <strong className="text-title">No payment friction</strong> — Buyers send a request with contact details.
            You follow up, invoice, and ship the way you already do—no cart or processor required on our site.
          </li>
          <li>
            <strong className="text-title">Orders in one place</strong> — Buyer requests show up in your CRM under
            Marketplace so nothing gets lost in email threads.
          </li>
        </ul>

        <h2 className="mt-12 text-xl font-semibold text-title">Platform listings & commission path</h2>
        <p className="mt-3 text-secondary">
          MotorsWinding.com can also list items on your behalf. Those orders are managed in our admin tools so we can
          coordinate fulfillment and any commission structure you agree to—still without forcing checkout on the
          public site.
        </p>

        <div className="mt-12 rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-title">Ready to list?</h3>
          <p className="mt-2 text-sm text-secondary">
            Open <strong className="text-title">Marketplace</strong> in your dashboard sidebar after you sign in.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/contact">
              <Button variant="primary" size="sm">
                Talk to us
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="sm">
                View plans
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
