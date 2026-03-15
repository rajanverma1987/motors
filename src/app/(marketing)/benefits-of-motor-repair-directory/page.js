import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";

const path = "/benefits-of-motor-repair-directory";

export const metadata = {
  title: "Benefits of Listing in a Motor Repair Directory | MotorsWinding.com",
  description:
    "Why electric motor repair and rewinding shops list in dedicated directories: qualified leads, better visibility, credibility, and a low-cost way to reach buyers searching for repair services.",
  keywords: [
    "motor repair directory benefits",
    "electric motor repair directory",
    "motor rewinding directory listing",
    "qualified motor repair leads",
    "motor repair shop visibility",
    "industrial motor repair directory",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "Benefits of Listing in a Motor Repair Directory | MotorsWinding.com",
    description:
      "Discover the advantages of listing your shop in a motor repair and rewinding directory.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Benefits of a Motor Repair Directory | MotorsWinding.com",
    description: "Discover the advantages of listing your shop in a motor repair directory.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BenefitsOfMotorRepairDirectoryPage() {
  return (
    <BlogPageLayout
      title="Benefits of listing in a motor repair directory"
      description="A dedicated electric motor repair directory connects your shop with buyers who are actively looking for repair, rewinding, and related services—so you spend less time chasing cold leads and more time winning jobs."
      breadcrumbLink={{ href: "/", label: "Home" }}
      canonicalPath={path}
      sidebarTitle="List your center"
      sidebarDescription="Join repair shops that receive qualified leads from our directory. Free to register and easy to manage."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Qualified leads, not random traffic
          </h2>
          <p className="mt-4 text-secondary">
            Buyers who use a motor repair directory already know they need repair or rewinding. They’re comparing shops, checking capabilities, and often requesting quotes. That means the leads you get are pre-qualified by intent—unlike generic ads or broad directories where most visitors aren’t looking for motor work.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Visibility where it matters
          </h2>
          <p className="mt-4 text-secondary">
            Directories built for motor repair rank for terms like &quot;motor repair shops,&quot; &quot;electric motor rewinding,&quot; and &quot;industrial motor repair.&quot; When your shop is listed, you share in that visibility. As the directory grows and gains authority, your listing continues to surface to new buyers without extra ad spend.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Credibility and trust
          </h2>
          <p className="mt-4 text-secondary">
            A complete, accurate profile—services, certifications, service area, contact info—helps buyers verify that you’re a real shop with the right capabilities. Many use the directory as a first check before calling. Consistent information across the directory and your own site reinforces trust and supports your reputation.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Low cost, ongoing results
          </h2>
          <p className="mt-4 text-secondary">
            Listing in a focused directory is usually a fraction of the cost of paid search or large-scale SEO. You get a persistent listing that works for you over time. There’s no per-click fee—you pay to be present, and you receive leads as they come in. For many shops, that’s a better return than one-off campaigns.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Reach beyond your immediate network
          </h2>
          <p className="mt-4 text-secondary">
            New plants, new maintenance staff, and new projects don’t always know your shop. A directory introduces you to buyers outside your current customer base. When they search by location, service type, or industry, your listing can appear—so you’re considered even when you’re not the incumbent vendor.
          </p>
        </section>

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">
            Get listed and start receiving leads
          </h2>
          <p className="mt-4 text-secondary">
            <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
              List your electric motor repair center
            </Link>{" "}
            in our directory.{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Create a free account
            </Link>{" "}
            to manage your profile and respond to quote requests in one place.
          </p>
        </section>
      </article>
    </BlogPageLayout>
  );
}
