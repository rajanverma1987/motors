import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import MarketingRelatedGuides from "@/components/marketing/MarketingRelatedGuides";

const path = "/technician-mobile-app-shop-floor-first";

export const metadata = {
  title: "Technician Mobile App for Motor Repair Shops | Shop-Floor First",
  description:
    "Give technicians a mobile app to scan job Tag QR codes (repair job number), update work order status, and capture testing data from the floor in real time.",
  keywords: [
    "technician mobile app motor repair",
    "shop floor work order app",
    "motor testing data mobile",
    "motor repair qr tag app",
  ],
  openGraph: {
    title: "Technician Mobile App for Motor Repair Shops | MotorsWinding.com",
    description:
      "Shop-floor first mobile workflow: QR scan, status updates, and testing notes in one app.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Technician Mobile App for Motor Repair Shops",
    description: "Run jobs from the floor with QR scans, live status, and testing logs.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function TechnicianMobileAppPage() {
  return (
    <BlogPageLayout
      title="Technician mobile app (shop-floor first)"
      description="Technicians should not need to walk back to an office terminal just to update progress. A shop-floor first app lets them scan tags, move jobs forward instantly, and capture testing data at the machine."
      breadcrumbLink={{ href: "/", label: "Home" }}
      canonicalPath={path}
      sidebarTitle="Move updates to the floor"
      sidebarDescription="Keep technicians in motion while management still gets clean, real-time data."
      sidebarCta={<ListYourShopCta />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="mt-2 text-2xl font-bold text-title sm:text-3xl">
            What technicians can do in the app
          </h2>
          <p className="mt-4 leading-relaxed text-secondary">
            The app is designed for fast shop-floor actions: scan the Tag QR from{" "}
            <Link href="/dashboard/repair-flow" className="font-medium text-primary hover:underline">
              Job Write-Up
            </Link>{" "}
            (it encodes the repair job number), open the assigned work order, update status, and attach testing
            notes/readings. This reduces lag between floor activity and office visibility so dispatch, quotes, and
            customer updates stay accurate.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
            Why it matters for throughput
          </h2>
          <p className="mt-4 leading-relaxed text-secondary">
            Small delays from manual updates add up across dozens of jobs. When updates happen at the motor, your{" "}
            <Link href="/dashboard/job-board" className="font-medium text-primary hover:underline">
              job board
            </Link>{" "}
            reflects real progress immediately, and supervisors can clear blockers sooner.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
            Connected with quotes, work orders, and testing records
          </h2>
          <p className="mt-4 leading-relaxed text-secondary">
            Mobile updates are tied to the same records used by office staff. Work orders are linked to the repair job
            and its primary final quote, so the path from{" "}
            <Link href="/dashboard/repair-flow" className="font-medium text-primary hover:underline">
              Job Write-Up
            </Link>{" "}
            through{" "}
            <Link href="/dashboard/quotes" className="font-medium text-primary hover:underline">
              Quotes (RFQs)
            </Link>{" "}
            to{" "}
            <Link href="/dashboard/work-orders" className="font-medium text-primary hover:underline">
              work order
            </Link>{" "}
            and invoice stays consistent, with testing data logged as part of the motor history.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
            Built-in calculators for technicians
          </h2>
          <p className="mt-4 leading-relaxed text-secondary">
            The same platform also includes practical calculators technicians use during diagnostics and repair prep.
            Teams can quickly check electrical and motor-related values without leaving the workflow, reducing mistakes
            and back-and-forth with office staff.
          </p>
          <p className="mt-4 leading-relaxed text-secondary">
            This works especially well with the mobile app: scan the job Tag QR, review motor context, use calculator results,
            and log updates in one flow. Explore the{" "}
            <Link href="/dashboard/calculators" className="font-medium text-primary hover:underline">
              calculators module
            </Link>{" "}
            in the CRM.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
            Rollout tips for your team
          </h2>
          <p className="mt-4 leading-relaxed text-secondary">
            Start with one or two status checkpoints where updates are most often missed, then expand. The goal is not
            extra admin work for technicians; it is fewer interruptions and faster handoffs because everyone sees the
            same live information.
          </p>
        </section>

        <MarketingRelatedGuides audience="shop" excludeHref={path} className="mt-12 border-t border-border pt-10" />
      </article>
    </BlogPageLayout>
  );
}
