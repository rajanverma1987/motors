import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import GetQuoteCta from "@/components/marketing/GetQuoteCta";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";

const path = "/emergency-motor-repair-what-to-do";

export const metadata = {
  title: "Emergency Motor Repair: What to Do When a Motor Fails | MotorsWinding.com",
  description:
    "When you have an emergency motor failure: steps to take, how to find 24/7 or rush repair shops, and how to get a fast quote for repair or rewinding.",
  keywords: [
    "emergency motor repair",
    "rush motor rewind",
    "24 7 motor repair",
    "motor failure emergency",
    "emergency motor rewinding",
    "urgent motor repair",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "Emergency Motor Repair: What to Do When a Motor Fails | MotorsWinding.com",
    description:
      "Practical steps and how to find emergency and rush motor repair and rewinding services.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Emergency Motor Repair: What to Do | MotorsWinding.com",
    description: "Practical steps and how to find emergency and rush motor repair services.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function EmergencyMotorRepairWhatToDoPage() {
  return (
    <BlogPageLayout
      title="Emergency motor repair: what to do when a motor fails"
      description="A motor failure can shut down a line or a facility. Knowing what to do next—and where to find rush or emergency repair—helps you get back online faster and avoid costly downtime."
      breadcrumbLink={{ href: "/electric-motor-reapir-shops-listings", label: "Find repair centers" }}
      canonicalPath={path}
      sidebarTitle="Need a quote or a shop now?"
      sidebarDescription="Submit your motor details for a quote, or browse our directory to find repair centers—including those that offer emergency and rush service."
      sidebarCta={<GetQuoteCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Secure the area and document the failure
          </h2>
          <p className="mt-4 text-secondary">
            If the motor is part of running equipment, follow your lockout/tagout and safety procedures. Note what happened: tripping, noise, smoke, vibration, or no start. If safe, capture the nameplate data (manufacturer, model, HP, voltage, RPM). Photos of the motor and nameplate help the repair shop give a faster, more accurate response. This information speeds up the quote process when you contact a shop.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Contact a shop that offers rush or emergency service
          </h2>
          <p className="mt-4 text-secondary">
            Many repair shops offer rush turnaround or 24/7 emergency service—often at a premium. Use a directory or search for &quot;emergency motor repair&quot; or &quot;rush motor rewind&quot; in your area. Call or submit a request with motor type, size, and a brief description of the failure. Shops that specialize in emergency work can often give you an initial timeline and quote the same day.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Get a clear quote and timeline
          </h2>
          <p className="mt-4 text-secondary">
            Emergency and rush work can be more expensive than standard turnaround. Ask for a written quote (or at least an email summary) that includes: scope (inspection, repair vs. rewind), parts, labor, testing, and expected completion date. Confirm whether the timeline is calendar days or business days. Knowing the cost and date helps you decide whether to proceed or consider a spare motor if you have one.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Consider logistics
          </h2>
          <p className="mt-4 text-secondary">
            If the motor must be removed and shipped, factor in rigging, transport, and lead time. Some shops offer pickup or have relationships with freight providers. For very large or hard-to-move motors, field service (on-site repair or diagnosis) may be an option from shops that offer it. Clarify pickup, delivery, and who handles shipping when you request the quote.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Plan for the next time
          </h2>
          <p className="mt-4 text-secondary">
            After the emergency is resolved, review why the motor failed (bearing, burnout, overload, etc.) and whether maintenance or operating changes could reduce the chance of recurrence. For critical equipment, consider keeping a spare motor or a standing agreement with a repair shop for priority service. A little planning can cut stress and cost the next time something fails. When the dust settles, use{" "}
            <Link href="/when-to-repair-or-replace-electric-motor" className="text-primary font-medium hover:underline">
              repair vs. replace
            </Link>{" "}
            and{" "}
            <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary font-medium hover:underline">
              typical repair costs
            </Link>{" "}
            to plan the next decision with numbers.
          </p>
        </section>

        <MarketingRelatedGuides excludeHref={path} className="mt-12" />

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">
            Find emergency and rush repair shops
          </h2>
          <p className="mt-4 text-secondary">
            <Link href="/electric-motor-reapir-shops-listings" className="text-primary font-medium hover:underline">
              Search our directory of electric motor repair centers
            </Link>{" "}
            —many list emergency or 24/7 service. You can also submit your motor details and we’ll connect you with shops that can quote your job, including rush turnaround when available.
          </p>
        </section>
      </article>
    </BlogPageLayout>
  );
}
