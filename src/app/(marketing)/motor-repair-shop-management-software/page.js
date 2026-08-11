import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import SoftwareSeoFaqJsonLd from "@/components/marketing/SoftwareSeoFaqJsonLd";
import SoftwareClusterLinks from "@/components/marketing/SoftwareClusterLinks";
import {
  SEO_SOFTWARE_PILLAR_PATH,
  SEO_SOFTWARE_WORK_ORDER_PATH,
  SEO_SOFTWARE_INVENTORY_PATH,
  SEO_SOFTWARE_CRM_PATH,
  SEO_SOFTWARE_INVOICING_PATH,
  SEO_SOFTWARE_COMPARISON_PATH,
} from "@/lib/seo-software-paths";

const path = SEO_SOFTWARE_PILLAR_PATH;

const TITLE = "Motor Repair Shop Management Software | IQMotorBase";
const DESCRIPTION =
  "Run job write-ups, work orders, inventory, invoicing, and repair leads in one system built specifically for electric motor repair shops. Book a demo.";

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
    title: TITLE,
    description: DESCRIPTION,
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqItems = [
  {
    q: "How much does motor repair shop management software cost?",
    a: "IQMotorBase uses custom pricing—monthly, yearly, or one-time—tailored to the shop’s workflow. There is no published self-serve price list. Book a demo to get pricing for your shop.",
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
    a: "IQMotorBase is built for electric motor and rewind shops—not cars. Motor and customer registries carry serial numbers, specs, service history, and test results across visits. Work orders carry motor details and quote-backed line items. Tag QR floor updates and inventory reservation are tied to that same job path. Auto-shop tools are built for oil changes and vehicle RO workflows; they do not replace a motor-specific record.",
  },
  {
    q: "Does the software also generate leads for my shop?",
    a: "Yes. Leads originate from the IQMotorBase public directory and local SEO pages. Shops can take shared leads (sent to multiple shops) or exclusive leads (one shop only). A credit balance deducts when a lead is delivered. A won lead converts directly into a customer and Job Write-Up—no re-entry into a separate CRM.",
  },
];

export default function MotorRepairShopManagementSoftwarePage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Motor repair shop management software for electric motor and rewind shops"
        description="Job write-ups, work orders, inventory, invoicing, and repair leads in one system—built for motor repair, not adapted from auto repair. Book a demo to see the workflow on your shop’s terms."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarTitle="Book a demo"
        sidebarDescription="Custom pricing for your shop’s workflow. Tell us who you are and we’ll follow up."
        sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              IQMotorBase is shop management software for electric motor repair and rewinding businesses—not general
              auto repair, not generic field service. Every repair starts as a Job Write-Up with its own job number:
              intake, inspection notes, preliminary and final quotes, customer send, attachments, shop actions, and
              the path into work orders and invoices stay on that same record. You are not re-entering motor details
              and specs across disconnected screens.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The one-sentence difference versus almost every competitor in “motor repair software” search results:
              IQMotorBase is the only shop system in this cluster that also generates the shop’s leads. Leads come
              from the public directory and local SEO pages, convert into a customer and Job Write-Up without a second
              CRM, and sit beside the same inventory, board, and billing tools the floor already uses. If you run a
              rewind shop and you are tired of spreadsheets for WIP and a separate inbox for inquiries, this page is
              the map of how the product actually works.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Built for motor repair, not adapted from auto repair
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Search “motor repair software” and you will still see tools built for cars—Tekmetric, Shop-Ware,
              Torque360, and other auto-shop platforms. Those products optimize vehicle repair orders, tire packages,
              and consumer-facing RO workflows. An electric motor on a stand with coil data, insulation resistance
              readings, and a customer who asks for last year’s test sheet is a different job. Adapting an auto CRM
              means stuffing winding notes into a “comments” field and hoping nobody loses the paper slip from the
              test bench.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase keeps a digital record per motor: serial number, specs, service history, and test results
              that persist across repeat visits. When a returning customer’s motor comes back, that history is
              available when you quote new work—not buried in an old PDF folder. The customer registry holds contacts,
              addresses, billing details, and full job history alongside that motor record.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              On the floor, a Tag QR printed from the Job Write-Up encodes the job number. Technicians scan it with
              the mobile app, open the correct work order, update status, and log testing notes and values without
              walking back to a desk. The office sees those updates on the same job board. Work orders themselves are
              created from the job’s primary final quote so motor details, customer, scope, and line items carry
              through automatically—and numbering stays aligned to the job so floor and office reference the same ID.
              That chain is motor-shop work. It is not an oil-change form with the labels renamed.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Shop actions on the Job Write-Up include print, generate work order, and generate Tag QR—so the desk is
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
              same job—formal RFQs start from the Job Write-Up and stay linked to that number. Quote line items can
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
              The work order is generated from the job’s primary final quote—not typed up as a disconnected object.
              Motor details, customer, scope, and line items carry through. Numbering stays aligned to the job. On
              the job board, status columns (for example Received, Inspection, Rewinding, Testing, Ready—configurable
              for the shop) show where work sits. Managers drag or tap a job between statuses. Technicians use Tag QR
              on the floor to open the work order, move status, and enter test values so the board stays current
              without a second data entry pass at the end of the shift.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              When the work order ships, consumed quantities deduct from inventory automatically—no manual
              double-entry to make the books match the shelf. Invoices are generated from completed work orders and
              approved quote line items so amounts match what was agreed. Extra charges or adjustments can be added
              afterward and still link to accounts receivable. Payment tracking includes online payment links, and
              aging reports support follow-up on past-due accounts. Sales commission data lives at the job level on
              the Job Write-Up so commission conversations are not a separate spreadsheet after the fact.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Receiving and shipping log motors and parts moving in and out—customer motors arriving, vendor
              deliveries against POs, shipments back to customers—each tied to the relevant work order or PO so you
              can answer “where is it right now?” Reports cover revenue, completed jobs, technician workload, and top
              customers without exporting to a spreadsheet just to see the week. An API is available to sync
              customers, work orders, and quotes with external CRM, accounting, or ERP tools when the shop already
              relies on those apps—one source of truth for the repair job, not a mandate to rip out accounting
              overnight.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Low-stock alerts surface on the dashboard so purchasing is not waiting for someone to notice an empty
              bin after a promise date was already given. Vendor invoices attach to POs; PO status is tracked as open,
              invoiced, or paid. That purchasing trail sits next to the same parts catalog the quote used—SKU, unit of
              measure, on-hand, reserved, and optional bin or aisle location when you use locations.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Leads are not a bolt-on form. They originate from the IQMotorBase public directory and local SEO pages
              (for example city- and service-oriented searches). Shared leads go to multiple shops; exclusive leads go
              to one shop—used for emergency or high-value work. The shop tops up a lead credit balance; credits deduct
              when a lead is delivered, not when you decide you “like” it. A won lead becomes a customer and a Job
              Write-Up without retyping into a separate CRM. That lead-to-job path is the differentiator versus Spring
              Point, Aptean, Tekmetric, or any generic shop tool that only manages work after the phone already rang.
              Details live on{" "}
              <Link href={SEO_SOFTWARE_CRM_PATH} className="text-primary font-medium hover:underline">
                motor repair CRM software
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
                    <td className="py-3 pr-4">Yes — logged on the work order / mobile floor path</td>
                    <td className="py-3 pr-4">Manual cells / files</td>
                    <td className="py-3 pr-4">Usually vehicle-oriented forms</td>
                    <td className="py-3">
                      Yes — MotorBase captures test data on the job; QM Wizard for forms/checklists and tolerances
                      (springpt.com)
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">Lead generation included</td>
                    <td className="py-3 pr-4">Yes — directory + local SEO pages, shared/exclusive credits</td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-danger">No</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-danger">Typically no</span>
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-danger">No</span> — CRM manages sales opportunities/prospects; no
                      public claim of originating inbound repair leads for the shop
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">Mobile floor updates (Tag QR)</td>
                    <td className="py-3 pr-4">Yes — scan job number, status + test notes</td>
                    <td className="py-3 pr-4">
                      <span className="font-bold text-danger">No</span>
                    </td>
                    <td className="py-3 pr-4">Varies; rarely Tag QR tied to motor WO</td>
                    <td className="py-3">
                      Yes — Mobile Paperwork, QM Wizard on tablets/mobile, Time Clock; not the same Tag QR job-number
                      scan path
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">Inventory reservation on quote approval</td>
                    <td className="py-3 pr-4">Yes — reserved vs on-hand; consume on ship</td>
                    <td className="py-3 pr-4">Manual</td>
                    <td className="py-3 pr-4">Often separate or absent</td>
                    <td className="py-3">
                      Inventory control; distinguishes available vs sold/allocated even if still on the shelf (public
                      docs do not spell out “reserve on quote approval” in those words)
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <td className="py-3 pr-4 font-medium text-title">API / integrations</td>
                    <td className="py-3 pr-4">Yes — customers, work orders, quotes</td>
                    <td className="py-3 pr-4">N/A</td>
                    <td className="py-3 pr-4">Varies by product</td>
                    <td className="py-3">
                      Spring Point Connect / Web Services (supplier, payments, storefront, etc. per their suite pages)
                    </td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-3 pr-4 font-medium text-title">Pricing model</td>
                    <td className="py-3 pr-4">Custom — monthly, yearly, or one-time; book a demo</td>
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
              AR for the office, and directory-driven leads that become customers without a second CRM. Marketplace
              listings for spare parts, surplus motors, and tools can publish from the dashboard with SEO-friendly
              URLs when you have surplus to move—there is no on-platform checkout; the buyer sends a request and the
              shop follows up. Careers postings for technicians and winders can go from the CRM to the public Careers
              page with the shop’s name and location; candidates apply online and applications are reviewed in the
              dashboard. None of that requires inventing a parallel process outside the shop system.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Onboarding assumes most prospects are still on spreadsheets. Existing customers, motors, and job history
              can be uploaded or imported from spreadsheets or other systems. The point is not a flashy empty demo
              account—it is getting your real names, serials, and open work into the same Job Write-Up path your team
              will use on Monday.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              How leads fill the customer list is covered in depth on{" "}
              <Link href={SEO_SOFTWARE_CRM_PATH} className="text-primary font-medium hover:underline">
                motor repair CRM software
              </Link>
              . For directory scale as proof of the lead side of the product, browse the{" "}
              <Link
                href="/electric-motor-repair-shops-listings"
                className="text-primary font-medium hover:underline"
              >
                electric motor repair shops listings
              </Link>
              . Pricing is custom—see{" "}
              <Link href="/pricing" className="text-primary font-medium hover:underline">
                pricing
              </Link>{" "}
              and book a demo. Buyers comparing repair cost context can also read{" "}
              <Link href="/cost-of-motor-repair-and-rewinding" className="text-primary font-medium hover:underline">
                cost of motor repair and rewinding
              </Link>
              .
            </p>
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

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Book a demo</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              There is no self-serve signup priced on a public rate card. Pricing is monthly, yearly, or one-time,
              matched to how your shop runs. Use the form to book a demo, or start from the{" "}
              <Link href="/pricing" className="text-primary font-medium hover:underline">
                pricing page
              </Link>
              . If you are evaluating options, read the{" "}
              <Link href={SEO_SOFTWARE_COMPARISON_PATH} className="text-primary font-medium hover:underline">
                2026 software comparison
              </Link>{" "}
              after you understand the Job Write-Up path above.
            </p>
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
