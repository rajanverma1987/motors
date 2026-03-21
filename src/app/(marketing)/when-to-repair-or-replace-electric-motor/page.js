import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import GetQuoteCta from "@/components/marketing/GetQuoteCta";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";

const path = "/when-to-repair-or-replace-electric-motor";

export const metadata = {
  title: "When to Repair or Replace an Electric Motor | Decision Guide",
  description:
    "Repair or replace an electric motor? Compare rewind and repair quotes to replacement cost, lead time, efficiency, and failure history. Use MotorsWinding.com to find shops and read our cost guide before you decide.",
  keywords: [
    "repair or replace electric motor",
    "motor repair vs replace",
    "electric motor repair cost",
    "motor rewind or replace",
    "industrial motor repair decision",
    "when to rewind motor",
  ],
  authors: [{ name: "MotorsWinding.com" }],
  openGraph: {
    title: "When to Repair or Replace an Electric Motor | MotorsWinding.com",
    description:
      "A practical guide to deciding when to repair vs. replace an electric motor.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "When to Repair or Replace an Electric Motor | MotorsWinding.com",
    description: "A practical guide to deciding when to repair vs. replace an electric motor.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function WhenToRepairOrReplaceElectricMotorPage() {
  return (
    <BlogPageLayout
      title="When to repair or replace an electric motor"
      description="Motor failure or repeated issues force a choice: repair or replace? The right decision depends on cost, lead time, efficiency, and how critical the application is. Here’s a practical way to think it through."
      breadcrumbLink={{ href: "/electric-motor-reapir-shops-listings", label: "Find repair centers" }}
      canonicalPath={path}
      sidebarTitle="Get a repair quote"
      sidebarDescription="Send your motor details and we’ll connect you with repair centers that can inspect and quote your job."
      sidebarCta={<GetQuoteCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Start with a repair quote
          </h2>
          <p className="mt-4 text-secondary">
            You don’t have to decide in a vacuum. Send the motor (or its nameplate and failure description) to a qualified repair shop for inspection and a written quote. The quote will tell you whether it’s a simple repair (bearings, cleaning, minor electrical) or a full rewind—and what it will cost. That number is the baseline for comparing against the cost and lead time of a new motor. See{" "}
            <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary font-medium hover:underline">
              what drives motor repair and rewinding cost
            </Link>{" "}
            so the quote lines up with what you expected.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Compare repair cost to replacement cost
          </h2>
          <p className="mt-4 text-secondary">
            As a rule of thumb, if repair (including rewind) is less than roughly 50–60% of the price of a new motor, repair is often the economical choice—especially for larger industrial motors where new units are expensive and lead times can be long. For small, off-the-shelf motors, replacement may be cheaper and faster. Always get actual quotes for both before deciding.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Factor in lead time and downtime
          </h2>
          <p className="mt-4 text-secondary">
            A repair shop may turn the motor around in days or a few weeks; a new motor might have a long delivery. For critical equipment, repair can get you back online sooner. If you have a spare motor, you can send the failed one for repair or rewind and rotate it back in as a spare when it’s ready—so lead time matters for planning.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            Consider age, efficiency, and future failures
          </h2>
          <p className="mt-4 text-secondary">
            Very old motors may be less efficient than modern designs; rewinding doesn’t change the core design. If energy savings from a high-efficiency replacement would pay back quickly, replacement can make sense. If the motor has failed repeatedly (bearing issues, burnouts), look at root cause—sometimes repair is still right, but recurring failures may justify replacement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            When repair usually wins
          </h2>
          <p className="mt-4 text-secondary">
            Repair (or rewind) is often the better choice when: the motor is large or custom; a new unit is expensive or has long lead time; the failure is a one-off (e.g., burnout after many years); and the quote is clearly lower than replacement. A quality rewind from an experienced shop can extend the motor’s life for many more years.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            When replacement may be better
          </h2>
          <p className="mt-4 text-secondary">
            Replacement can make sense when: the motor is small and cheap; repair or rewind cost approaches or exceeds the price of a new unit; you want higher efficiency and the payback is acceptable; or the motor has a history of repeated failures and the application justifies a new unit.
          </p>
        </section>

        <MarketingRelatedGuides excludeHref={path} className="mt-12" />

        <section className="border-t border-border pt-10 mt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">
            Get a quote and decide with real numbers
          </h2>
          <p className="mt-4 text-secondary">
            <Link href="/electric-motor-reapir-shops-listings" className="text-primary font-medium hover:underline">
              Find electric motor repair shops
            </Link>{" "}
            in our directory, or{" "}
            <Link href="/contact" className="text-primary font-medium hover:underline">
              submit your motor details for a quote
            </Link>
            . Many shops offer free or low-cost inspection so you can compare repair cost to replacement before committing. If downtime is expensive, read{" "}
            <Link href="/emergency-motor-repair-what-to-do" className="text-primary font-medium hover:underline">
              emergency motor repair
            </Link>{" "}
            for rush options.
          </p>
        </section>
      </article>
    </BlogPageLayout>
  );
}
