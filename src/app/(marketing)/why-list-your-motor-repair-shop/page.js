import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";

const path = "/why-list-your-motor-repair-shop";

export const metadata = {
  title: "Why List Your Motor Repair Shop in a Directory | Get More Customers",
  description:
    "Listing your electric motor repair shop in a qualified directory increases visibility, builds trust, and brings in leads from buyers actively searching for repair services.",
  keywords: [
    "list motor repair shop",
    "motor repair directory",
    "electric motor repair listing",
    "motor rewinding shop directory",
    "get more motor repair customers",
    "industrial motor repair leads",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "Why List Your Motor Repair Shop in a Directory | MotorsWinding.com",
    description:
      "Reach more customers by listing your motor repair business in a dedicated directory. Learn the benefits and how to get started.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why List Your Motor Repair Shop in a Directory | MotorsWinding.com",
    description:
      "Reach more customers by listing your motor repair business in a dedicated directory.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function WhyListYourMotorRepairShopPage() {
  return (
    <BlogPageLayout
      title="Why list your motor repair shop in a directory?"
      description="Getting listed in a dedicated electric motor repair directory puts your shop in front of facility managers, maintenance teams, and procurement specialists who are actively looking for repair and rewinding services."
      breadcrumbLink={{ href: "/", label: "Home" }}
      canonicalPath={path}
      sidebarTitle="Get your shop in front of buyers"
      sidebarDescription="List your center in our directory and start receiving qualified leads from companies searching for motor repair and rewinding services."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Buyers search directories when they need repair and rewinding
          </h2>
          <p className="mt-4 text-secondary">
            When a plant manager has a failed motor or a maintenance team needs a rewind quote, they don’t always rely on a single vendor. They search for &quot;motor repair near me,&quot; &quot;electric motor rewinding,&quot; or &quot;industrial motor repair shop.&quot; A directory that focuses on electric motor repair and rewinding captures that intent and sends those leads to listed shops—so you’re in the consideration set from day one.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Stand out without competing with general listings
          </h2>
          <p className="mt-4 text-secondary">
            Generic business directories mix every industry. A motor-repair–specific directory highlights your capabilities—AC/DC repair, rewinding, VFD, pump, generator—and the industries you serve. That means better-qualified leads: people who need what you do, not random inquiries. You also avoid competing with unrelated businesses for the same keywords.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Build credibility and local visibility
          </h2>
          <p className="mt-4 text-secondary">
            A complete profile—services, certifications, service area, and contact details—helps buyers compare shops and shortlist. Many use directories to verify that a shop exists, is legitimate, and offers the services they need. Being listed with consistent, accurate information supports both SEO and trust when buyers look you up later.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Capture leads at the moment of need
          </h2>
          <p className="mt-4 text-secondary">
            Directories that allow quote requests or contact forms turn searchers into leads. When someone submits a request through the directory, you get the inquiry while the need is hot. That’s often more effective than waiting for cold traffic to find your website on its own—especially for emergency repair and time-sensitive jobs.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Low cost, long-term visibility
          </h2>
          <p className="mt-4 text-secondary">
            Listing in a focused directory is typically a fraction of the cost of broad paid ads or heavy SEO work. You get a persistent presence that works for you over time. As the directory gains authority and ranks for terms like &quot;motor repair shops&quot; or &quot;rewinding services,&quot; your listing benefits from that visibility.
          </p>
        </section>

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">
            Ready to get listed?
          </h2>
          <p className="mt-4 text-secondary">
            <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
              List your electric motor repair center
            </Link>{" "}
            and start receiving qualified leads. You can also{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              create a free account
            </Link>{" "}
            to manage your listing and respond to inquiries in one place.
          </p>
        </section>
      </article>
    </BlogPageLayout>
  );
}
