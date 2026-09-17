import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SoftwareDemoBookingPanel from "@/components/marketing/SoftwareDemoBookingPanel";
import SoftwareSeoFaqJsonLd from "@/components/marketing/SoftwareSeoFaqJsonLd";
import SoftwareClusterLinks from "@/components/marketing/SoftwareClusterLinks";
import DemoBookingLink from "@/components/marketing/demo-booking-link";
import {
  SEO_SOFTWARE_PILLAR_PATH,
  SEO_SOFTWARE_WORK_ORDER_PATH,
  SEO_SOFTWARE_INVENTORY_PATH,
  SEO_SOFTWARE_CRM_PATH,
  SEO_SOFTWARE_INVOICING_PATH,
  SEO_SOFTWARE_COMPARISON_PATH,
} from "@/lib/seo-software-paths";
import {
  HERO_DASHBOARD_TABLET_ALT,
  HERO_DASHBOARD_TABLET_PATH,
  heroDashboardTabletOgImage,
} from "@/lib/hero-dashboard-seo";

const path = SEO_SOFTWARE_PILLAR_PATH;

// The root layout applies a "%s | IQMotorBase" template, so the brand suffix is
// omitted here; SOCIAL_TITLE carries it because og:/twitter: titles skip the template.
const TITLE = "Electric Motor Repair Shop Management Software";
const SOCIAL_TITLE = `${TITLE} | IQMotorBase`;
const DESCRIPTION =
  "Run job write-ups, work orders, inventory, invoicing, QuickBooks Online sync, and repair leads in one system built for electric motor repair shops. Starts at $349/mo. Book a free demo.";

const heroOg = heroDashboardTabletOgImage({
  alt: "IQMotorBase motor repair shop management software dashboard on a tablet, service proposals pipeline and job list",
});

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "motor repair shop management software",
    "electric motor repair software",
    "motor repair shop software",
    "electric motor repair management software",
  ],
  openGraph: {
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
    images: [heroOg],
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: HERO_DASHBOARD_TABLET_PATH,
        alt: heroOg.alt,
      },
    ],
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqItems = [
  {
    q: "How much does IQMotorBase cost?",
    a: "IQMotorBase is $349 per month, or $3,235 per year (equivalent to $269 per month, saving $983 per year). Both plans include unlimited users and the full platform. Founder pricing is also available for the first 10 shops at a permanently locked discounted rate. Book a free demo to see the workflow and confirm fit for your shop.",
  },
  {
    q: "Can I import my existing customer and job data?",
    a: "Yes. Existing customers, motors, and job history can be uploaded or imported from spreadsheets or other systems at onboarding. Migration support is part of getting a shop live.",
  },
  {
    q: "Does it work on mobile for technicians?",
    a: "Yes. A Tag QR printed from the Job Write-Up encodes the job number. Technicians scan it with the mobile app to open the correct work order, update job status, and log motor testing notes and values from the floor. The office sees those updates on the same job board in real time.",
  },
  {
    q: "How is this different from general auto repair shop software?",
    a: "IQMotorBase is built for electric motor and rewind shops, not cars. Motor and customer registries carry serial numbers, specs, service history, and test results across visits. Work orders carry motor details and quote-backed line items. Tag QR floor updates and inventory reservation are tied to that same job path. Auto-shop tools are built for oil changes and vehicle RO workflows; they do not replace a motor-specific record.",
  },
  {
    q: "Does the software also generate leads for my shop?",
    a: "Yes. Leads originate from the IQMotorBase public directory and local SEO pages. Shops can take shared leads (sent to multiple shops) or exclusive leads (one shop only). A credit balance deducts when a lead is delivered. A won lead converts directly into a customer and Job Write-Up, no re-entry into a separate Shop Management System.",
  },
  {
    q: "Does IQMotorBase integrate with QuickBooks Online?",
    a: "Yes. Connect QuickBooks Online under Settings → Accounts. When a job reaches your selected closed status, IQMotorBase syncs customers, invoices, payments, and vendor purchase orders to QBO so you do not re-key the shop floor into your books.",
  },
];

export default function MotorRepairShopManagementSoftwarePage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Motor repair shop management software for electric motor and rewind shops"
        description="Job write-ups, work orders, inventory, invoicing, and repair leads in one system, built for motor repair, not adapted from auto repair. Starts at $349/mo. Book a free 30-min demo."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        wideSidebar
        sidebarUnwrapped
        stickySidebar
        heroImage={HERO_DASHBOARD_TABLET_PATH}
        heroImageAlt={HERO_DASHBOARD_TABLET_ALT}
        heroEyebrow="Built for motor repair shops"
        heroHighlights={[
          "Job Write-Ups & work orders",
          "Inventory & QuickBooks Online",
          "Repair leads built in",
        ]}
        heroPrimaryCta={
          <DemoBookingLink className="inline-flex min-h-12 w-full min-w-0 touch-manipulation items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-semibold text-white hover:opacity-90 sm:w-auto sm:min-h-[3.25rem]">
            Book a free 30-min demo
          </DemoBookingLink>
        }
        heroSecondaryCta={
          <Link
            href="/pricing"
            className="inline-flex min-h-12 w-full min-w-0 touch-manipulation items-center justify-center rounded-md border border-border bg-transparent px-6 py-3 text-base font-semibold text-text hover:border-primary/30 hover:bg-card sm:w-auto sm:min-h-[3.25rem]"
          >
            See pricing
          </Link>
        }
        sidebarCta={
          <SoftwareDemoBookingPanel sourcePage={path} layout="sidebar" idPrefix="software-demo-sidebar" />
        }
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              IQMotorBase is shop management software for electric motor repair and rewinding businesses, not general
              auto repair, not generic field service. Every repair starts as a Job Write-Up with its own job number:
              intake, inspection notes, preliminary and final quotes, customer send, attachments, shop actions, and
              the path into work orders and invoices stay on that same record. You are not re-entering motor details
              and specs across disconnected screens.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The one-sentence difference versus almost every competitor in “motor repair software” search results:
              IQMotorBase is the only shop system in this cluster that also generates the shop’s leads. Leads come
              from the public directory and local SEO pages, convert into a customer and Job Write-Up without a second
              Shop Management System, and sit beside the same inventory, board, and billing tools the floor already uses. If you run a
              rewind shop and you are tired of spreadsheets for WIP and a separate inbox for inquiries, this page is
              the map of how the product actually works.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Built for motor repair, not adapted from auto repair
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Search “motor repair software” and you will still see tools built for cars, Tekmetric, Shop-Ware,
              Torque360, and other auto-shop platforms. Those products optimize vehicle repair orders, tire packages,
              and consumer-facing RO workflows. An electric motor on a stand with coil data, insulation resistance
              readings, and a customer who asks for last year’s test sheet is a different job. Adapting an auto Shop Management System
              means stuffing winding notes into a “comments” field and hoping nobody loses the paper slip from the
              test bench.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase keeps a digital record per motor: serial number, specs, service history, and test results
              that persist across repeat visits. When a returning customer’s motor comes back, that history is
              available when you quote new work, not buried in an old PDF folder. The customer registry holds contacts,
              addresses, billing details, and full job history alongside that motor record.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              On the floor, a Tag QR printed from the Job Write-Up encodes the job number. Technicians scan it with
              the mobile app, open the correct work order, update status, and log testing notes and values without
              walking back to a desk. The office sees those updates on the same job board. Work orders themselves are
              created from the job’s primary final quote so motor details, customer, scope, and line items carry
              through automatically, and numbering stays aligned to the job so floor and office reference the same ID.
              That chain is motor-shop work. It is not an oil-change form with the labels renamed.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Shop actions on the Job Write-Up include print, generate work order, and generate Tag QR, so the desk is
              not exporting a PDF into a different “floor system.” Attachments stay on the job. Preliminary and final
              quotes stay in the pipeline on that same record. When a tech asks which motor is on which stand, the
              answer is a job number, not a nickname written on masking tape.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For a longer side-by-side look at options shops actually weigh, see our{" "}
              <Link href={SEO_SOFTWARE_COMPARISON_PATH} className="text-primary font-medium hover:underline">
                2026 comparison of software for electric motor repair shops
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Full workflow: Job Write-Up through payment
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Picture a Tuesday. A motor arrives. The counter opens a Job Write-Up and assigns a job number. Intake
              and inspection notes live on that record. Preliminary and final quotes sit in the quote pipeline on the
              same job, formal RFQs start from the Job Write-Up and stay linked to that number. Quote line items can
              pull from the shop’s parts catalog so availability is visible while you price the job. When the customer
              gets the quote and you move forward, you are not starting a second “job” in another app.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              When a quote is approved, parts on that quote get reserved: on-hand minus reserved is what you can still
              promise to other jobs. If the quote needs something you do not have, shortfalls can generate a vendor PO
              from the quote screen, tied to a supplier you already store with contact and terms. That reservation
              step is what stops two jobs from being sold against the same physical bearing.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The work order is generated from the job’s primary final quote, not typed up as a disconnected object.
              Motor details, customer, scope, and line items carry through. Numbering stays aligned to the job. On
              the job board, status columns (for example Received, Inspection, Rewinding, Testing, Ready, configurable
              for the shop) show where work sits. Managers drag or tap a job between statuses. Technicians use Tag QR
              on the floor to open the work order, move status, and enter test values so the board stays current
              without a second data entry pass at the end of the shift.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              When the work order ships, consumed quantities deduct from inventory automatically, no manual
              double-entry to make the books match the shelf. Invoices are generated from completed work orders and
              approved quote line items so amounts match what was agreed. Extra charges or adjustments can be added
              afterward and still link to accounts receivable. Payment tracking includes online payment links, and
              aging reports support follow-up on past-due accounts. Sales commission data lives at the job level on
              the Job Write-Up so commission conversations are not a separate spreadsheet after the fact.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Receiving and shipping log motors and parts moving in and out, customer motors arriving, vendor
              deliveries against POs, shipments back to customers, each tied to the relevant work order or PO so you
              can answer “where is it right now?” Reports cover revenue, completed jobs, technician workload, and top
              customers without exporting to a spreadsheet just to see the week. Built-in QuickBooks Online sync pushes
              customers, invoices, payments, and vendor purchase orders when a job reaches the closed status you
              configure, so the shop floor does not become a retyping station for accounting. An API is also available to
              sync customers, work orders, and quotes with other Shop Management System or ERP tools when the shop already relies on those
              apps, one source of truth for the repair job, not a mandate to rip out accounting overnight.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Low-stock alerts surface on the dashboard so purchasing is not waiting for someone to notice an empty
              bin after a promise date was already given. Vendor invoices attach to POs; PO status is tracked as open,
              invoiced, or paid. That purchasing trail sits next to the same parts catalog the quote used, SKU, unit of
              measure, on-hand, reserved, and optional bin or aisle location when you use locations.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Leads are not a bolt-on form. They originate from the IQMotorBase public directory and local SEO pages
              (for example city- and service-oriented searches). Shared leads go to multiple shops; exclusive leads go
              to one shop, used for emergency or high-value work. The shop tops up a lead credit balance; credits deduct
              when a lead is delivered, not when you decide you “like” it. A won lead becomes a customer and a Job
              Write-Up without retyping into a separate Shop Management System. That lead-to-job path is the differentiator versus Spring
              Point, Aptean, Tekmetric, or any generic shop tool that only manages work after the phone already rang.
              Details live on{" "}
              <Link href={SEO_SOFTWARE_CRM_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management system
              </Link>
              .
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Dig into the pieces:{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software for motor repair shops
              </Link>
              ,{" "}
              <Link href={SEO_SOFTWARE_INVENTORY_PATH} className="text-primary font-medium hover:underline">
                motor repair inventory software
              </Link>
              , and{" "}
              <Link href={SEO_SOFTWARE_INVOICING_PATH} className="text-primary font-medium hover:underline">
                invoicing and quoting
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Feature comparison</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Use this table as a checklist when someone tries to sell you “shop software” that was built for a
              different trade. Spring Point (MotorBase / Spring Point Suite) cells below are based on their public
              site at springpt.com. Where a detail is not stated publicly, the cell says so instead of guessing.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm text-secondary">
                <thead>
                  <tr className="border-b border-border text-title">
                    <th className="py-2 pr-4 font-semibold">Capability</th>
                    <th className="py-2 pr-4 font-semibold">IQMotorBase</th>
                    <th className="py-2 pr-4 font-semibold">Spreadsheets</th>
                    <th className="py-2 pr-4 font-semibold">Generic shop software</th>
                    <th className="py-2 font-semibold">Spring Point</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">Motor-specific test data on the job</td>
                    <td className="py-3 pr-4">Yes, logged on the work order / mobile floor path</td>
                    <td className="py-3 pr-4">Manual cells / files</td>
                    <td className="py-3 pr-4">Usually vehicle-oriented forms</td>
                    <td className="py-3">
                      Yes, MotorBase captures test data on the job; QM Wizard for forms/checklists and tolerances
                      (springpt.com)
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">Lead generation included</td>
                    <td className="py-3 pr-4">Yes, directory + local SEO pages, shared/exclusive credits</td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-danger">No</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-danger">Typically no</span>
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-danger">No</span>| Shop Management System manages sales opportunities/prospects; no
                      public claim of originating inbound repair leads for the shop
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">Mobile floor updates (Tag QR)</td>
                    <td className="py-3 pr-4">Yes, scan job number, status + test notes</td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-danger">No</span>
                    </td>
                    <td className="py-3 pr-4">Varies; rarely Tag QR tied to motor WO</td>
                    <td className="py-3">
                      Yes, Mobile Paperwork, QM Wizard on tablets/mobile, Time Clock; not the same Tag QR job-number
                      scan path
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">Inventory reservation on quote approval</td>
                    <td className="py-3 pr-4">Yes, reserved vs on-hand; consume on ship</td>
                    <td className="py-3 pr-4">Manual</td>
                    <td className="py-3 pr-4">Often separate or absent</td>
                    <td className="py-3">
                      Inventory control; distinguishes available vs sold/allocated even if still on the shelf (public
                      docs do not spell out “reserve on quote approval” in those words)
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">API / integrations</td>
                    <td className="py-3 pr-4">
                      Yes, QuickBooks Online sync (customers, invoices, payments, vendor POs) plus API for Shop Management System/ERP
                    </td>
                    <td className="py-3 pr-4">N/A</td>
                    <td className="py-3 pr-4">Varies by product</td>
                    <td className="py-3">
                      Spring Point Connect / Web Services (supplier, payments, storefront, etc. per their suite pages)
                    </td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-3 pr-4 font-medium text-title">Pricing model</td>
                    <td className="py-3 pr-4">
                      $349/mo or $3,235/yr (unlimited users). Founder pricing for first 10 shops.
                    </td>
                    <td className="py-3 pr-4">“Free” until errors cost jobs</td>
                    <td className="py-3 pr-4">Usually published SaaS tiers</td>
                    <td className="py-3">
                      Monthly subscription by concurrent user licenses + one-time setup/implementation fee (request
                      demo for numbers)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">What it replaces</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Spreadsheets, sticky notes, and separate tools don’t scale when the shop has more than a handful of open
              motors. The counter keeps a WIP sheet. The bench keeps a clipboard. Someone else runs QuickBooks or a
              stand-alone invoicing tool and retypes line items from a quote PDF. Leads sit in email or a shared inbox
              that nobody owns after 5 p.m. Parts “knowledge” lives in one person’s head until that person is out
              sick and a promised date slips.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase consolidates that stack around the Job Write-Up: quotes and work orders on the same job
              number, reservations and POs from the quote path, board and mobile updates for the floor, invoices and
              AR for the office, and directory-driven leads that become customers without a second Shop Management System. Built-in
              QuickBooks Online sync pushes customers, invoices, payments, and vendor POs when a job closes, so
              accounting does not become another retyping station. Marketplace listings for spare parts, surplus
              motors, and tools can publish from the dashboard with SEO-friendly URLs when you have surplus to
              move, there is no on-platform checkout; the buyer sends a request and the shop follows up. Careers
              postings for technicians and winders can go from the Shop Management System to the public Careers page with the shop’s name
              and location; candidates apply online and applications are reviewed in the dashboard. None of that
              requires inventing a parallel process outside the shop system.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Onboarding assumes most prospects are still on spreadsheets. Existing customers, motors, and job history
              can be uploaded or imported from spreadsheets or other systems. The point is not a flashy empty demo
              account, it is getting your real names, serials, and open work into the same Job Write-Up path your team
              will use on Monday.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              How leads fill the customer list is covered in depth on{" "}
              <Link href={SEO_SOFTWARE_CRM_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management system
              </Link>
              . For directory scale as proof of the lead side of the product, browse the{" "}
              <Link
                href="/electric-motor-repair-shops-listings"
                className="text-primary font-medium hover:underline"
              >
                electric motor repair shops listings
              </Link>
              . Pricing starts at $349/month or $3,235/year. See{" "}
              <Link href="/pricing" className="text-primary font-medium hover:underline">
                pricing
              </Link>{" "}
              or book a free demo. Buyers comparing repair cost context can also read{" "}
              <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary font-medium hover:underline">
                cost of motor repair and rewinding
              </Link>
              .
            </p>
          </section>

          <section id="pricing" className="mt-10 not-prose">
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
                  Simple, transparent pricing
                </h2>
                <p className="mt-3 text-secondary">
                  One platform. Unlimited users. Everything your motor repair shop needs.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-stretch">
                <div className="flex flex-col rounded-xl border border-border bg-bg p-6 text-left">
                  <div className="text-sm font-semibold text-secondary">Standard</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tabular-nums text-title">$349</span>
                    <span className="text-secondary">/month</span>
                  </div>
                  <p className="mt-1 text-sm text-secondary">or $3,235/year (save $983)</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-secondary">
                    Full platform. Unlimited users. Work orders, leads, inventory, invoicing, QuickBooks sync, and all
                    future updates.
                  </p>
                  <DemoBookingLink className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-base font-semibold text-white hover:opacity-90">
                    Book a free demo
                  </DemoBookingLink>
                </div>
                <div className="flex flex-col rounded-xl border-2 border-warning/50 bg-warning/5 p-6 text-left">
                  <span className="inline-block w-fit rounded-full bg-warning px-3 py-1 text-xs font-bold text-white">
                    Limited: founder spots available
                  </span>
                  <div className="mt-3 text-sm font-semibold text-secondary">Founder pricing</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span
                      className="select-none text-4xl font-bold tabular-nums text-warning blur-[6px]"
                      aria-hidden
                    >
                      ••••
                    </span>
                    <span className="text-secondary">/month</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-title">Permanently locked rate. Never increases.</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-secondary">
                    Everything in Standard at a significantly discounted rate, locked in for life. First 10 shops only.
                  </p>
                  <Link
                    href="/pricing#pricing-contact-form"
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-warning px-4 py-3 text-base font-semibold text-white hover:opacity-90"
                  >
                    Request founder pricing
                  </Link>
                </div>
              </div>
              <p className="mt-6 text-center text-sm text-secondary">
                Not sure which fits? Book a free demo. We will show you the platform before you decide anything.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Frequently asked questions</h2>
            <dl className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div key={item.q}>
                  <dt className="font-semibold text-title">{item.q}</dt>
                  <dd className="mt-2 text-secondary leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-10 not-prose">
            <div className="rounded-2xl bg-primary px-6 py-10 text-center sm:px-10 sm:py-12">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                See IQMotorBase in 30 minutes
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-white/80 sm:text-lg">
                Book a free demo call. We will show you the full platform and tell you honestly whether it fits your
                shop. No pressure.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <DemoBookingLink className="inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-primary hover:bg-white/90 sm:w-auto">
                  Book a free 30-minute demo
                </DemoBookingLink>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-12 w-full max-w-md items-center justify-center rounded-md border border-white/50 bg-transparent px-6 py-3 text-base font-semibold text-white hover:border-white hover:bg-white/10 sm:w-auto"
                >
                  See pricing first
                </Link>
              </div>
              <p className="mt-5 text-sm text-white/60">
                $349/mo or $3,235/yr. Founder pricing available for first 10 shops.
              </p>
            </div>
          </section>

          <SoftwareClusterLinks
            excludeHref={path}
            extraLinks={[
              { href: "/pricing", label: "Pricing" },
              { href: "/electric-motor-repair-shops-listings", label: "Electric motor repair shops listings" },
              { href: "/cost-of-motor-repair-and-rewinding", label: "Cost of motor repair and rewinding" },
              { href: "/technician-mobile-app-shop-floor-first", label: "Technician mobile app (shop floor first)" },
            ]}
          />
        </article>
      </BlogPageLayout>
    </>
  );
}
