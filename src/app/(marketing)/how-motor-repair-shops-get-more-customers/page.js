import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";

const path = "/how-motor-repair-shops-get-more-customers";

export const metadata = {
  title: "How Motor Repair Shops Get More Customers Online | Lead Generation",
  description:
    "Practical ways electric motor repair shops attract more customers: directory listings, SEO, and reaching buyers when they search for repair and rewinding services.",
  keywords: [
    "motor repair shop marketing",
    "motor repair lead generation",
    "get more motor repair customers",
    "electric motor repair SEO",
    "motor rewinding shop leads",
    "industrial motor repair marketing",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "How Motor Repair Shops Get More Customers | MotorsWinding.com",
    description:
      "Proven strategies for motor repair and rewinding shops to get more leads and customers online.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Motor Repair Shops Get More Customers | MotorsWinding.com",
    description: "Proven strategies for motor repair shops to get more leads and customers online.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function HowMotorRepairShopsGetMoreCustomersPage() {
  return (
    <BlogPageLayout
      title="How motor repair shops get more customers online"
      description="Electric motor repair and rewinding shops that show up where buyers search—directories, search engines, and industry sites—consistently win more quotes and repeat business. Here’s how to get in front of them."
      breadcrumbLink={{ href: "/", label: "Home" }}
      canonicalPath={path}
      sidebarTitle="Get in front of buyers today"
      sidebarDescription="List your shop in a directory built for motor repair and rewinding. Receive leads from companies actively looking for your services."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Be where buyers are already looking
          </h2>
          <p className="mt-4 text-secondary">
            Facility managers, maintenance leads, and procurement teams search for &quot;motor repair,&quot; &quot;rewinding near me,&quot; and &quot;emergency motor repair&quot; when they have a failure or a planned outage. Shops that appear in dedicated repair-shop directories and on the first page of search results get the first call. The goal isn’t just to have a website—it’s to be visible at the moment of need.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Use a directory built for motor repair and rewinding
          </h2>
          <p className="mt-4 text-secondary">
            General business listings attract mixed traffic. A directory focused on electric motor repair, rewinding, and related services attracts buyers who already know they need your type of work. Listing your shop there puts your capabilities—AC/DC, VFD, pump, generator, field service—in front of people comparing shops and requesting quotes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Make it easy for buyers to contact you
          </h2>
          <p className="mt-4 text-secondary">
            List a clear phone number, email, and service area. If the directory offers a quote-request or contact form, use it. Every extra step (wrong number, missing form, outdated address) loses leads. Shops that respond quickly and professionally to directory leads often turn them into long-term customers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Show what you do best
          </h2>
          <p className="mt-4 text-secondary">
            In your listing, spell out services (rewinding, repair, testing, field service), voltage and motor types, industries served, and certifications (EASA, ISO, UL, etc.). The more specific you are, the better you match search intent and the more confident buyers feel when they reach out. Detail reduces wasted inquiries and improves close rates.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Combine directory presence with your own site
          </h2>
          <p className="mt-4 text-secondary">
            Directory listings and your own website reinforce each other. Listings send traffic and links to your site; your site gives depth (case studies, capabilities, contact). Together they improve visibility in search and give buyers multiple ways to find and trust you.
          </p>
        </section>

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">
            Start getting more leads
          </h2>
          <p className="mt-4 text-secondary">
            <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
              Add your motor repair shop to our directory
            </Link>{" "}
            and receive qualified leads from companies searching for repair and rewinding services.{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Register for free
            </Link>{" "}
            to manage your listing and respond to inquiries.
          </p>
        </section>
      </article>
    </BlogPageLayout>
  );
}
