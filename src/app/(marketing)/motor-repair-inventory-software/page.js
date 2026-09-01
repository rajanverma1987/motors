import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import SoftwareSeoFaqJsonLd from "@/components/marketing/SoftwareSeoFaqJsonLd";
import SoftwareClusterLinks from "@/components/marketing/SoftwareClusterLinks";
import {
  SEO_SOFTWARE_PILLAR_PATH,
  SEO_SOFTWARE_WORK_ORDER_PATH,
  SEO_SOFTWARE_INVENTORY_PATH,
  SEO_SOFTWARE_INVOICING_PATH,
} from "@/lib/seo-software-paths";

const path = SEO_SOFTWARE_INVENTORY_PATH;

const TITLE = "Motor Repair Shop Inventory Software | IQMotorBase";
const DESCRIPTION =
  "Track on-hand and reserved parts, get low-stock alerts, and let inventory update itself when a work order ships. Built for motor repair shops.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "motor repair inventory software",
    "motor repair parts inventory management",
    "motor repair shop inventory management",
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
    q: "How does parts reservation work when a quote is approved?",
    a: "When a quote is approved, parts on that quote get reserved against the job. Available to promise is on-hand minus reserved. That stops two jobs from being sold against the same physical part while both quotes are still open.",
  },
  {
    q: "What happens if a quote needs a part that is not in stock?",
    a: "Shortfalls can generate a vendor purchase order directly from the quote screen, tied to a supplier. Vendor contacts and terms are stored per supplier. You track PO status as open, invoiced, or paid, and attach vendor invoices to the PO.",
  },
  {
    q: "When does inventory actually deduct from on-hand?",
    a: "When a work order ships, consumed quantities are deducted from inventory automatically. You do not re-enter the same line items in a separate stock sheet after delivery, the quote-backed reservation path carries through to shipment.",
  },
  {
    q: "Do I have to use bin and aisle locations?",
    a: "No. Bin and aisle location fields are optional on the parts catalog. Shops that pick by location can fill them in; shops that run a simpler shelf system can leave them blank and still use on-hand, reserved, alerts, and automatic consumption.",
  },
];

export default function MotorRepairInventorySoftwarePage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Motor repair shop inventory software: on-hand, reserved, and what ships"
        description="Track on-hand and reserved parts, raise purchase orders from shortfalls, and let stock deduct when a work order ships, built for electric motor repair shops. Book a demo."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarTitle="Book a demo"
        sidebarDescription="Custom pricing for your shop’s workflow. Tell us who you are and we’ll follow up."
        sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              Most motor repair shops do not lose money on inventory because they lack a spreadsheet. They lose it in
              two opposite mistakes: over-ordering because nobody trusts the count, or sitting a job while the
              customer waits for a bearing, seal, or lead wire that was already on the shelf, just not written down
              anywhere the counter can see. A whiteboard with “we have three” and a drawer that actually has one is
              how promised dates slip.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase inventory is built for that shop floor problem, not for a warehouse that ships cartons all
              day. The parts catalog holds SKU, unit of measure, on-hand count, reserved count, and optional bin/aisle
              location. Reservations follow the quote path; shortfalls can become vendor POs from the same screen;
              when a{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order
              </Link>{" "}
              ships, consumed quantities deduct without a second manual entry. This page walks that mechanics, how
              available-to-promise is calculated, how purchasing folds into the quote, and how the books stay tied to
              what left the dock. For the full Job Write-Up through payment path, start at{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management software
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              On-hand vs. reserved: available to promise
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              On-hand is what is physically in the shop. Reserved is what is already spoken for by approved quotes.
              Available to promise is the difference: on-hand minus reserved. That number, not the raw shelf count, is
              what you should use when you tell the next customer you can start their rewind next week with the parts
              you still have free.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Formal quotes (RFQs) start from the Job Write-Up and stay linked to the same job number. Quote line items
              can pull directly from the shop’s parts catalog, so the person writing the quote is looking at catalog
              parts, not inventing a free-text description that never touches stock. When that quote is approved, the
              parts on it get reserved against the job. The reservation is not a sticky note on a bin; it is a count
              change in the same system that will later generate the work order from the job’s primary final quote.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Without reservation, two estimators can both promise the last set of bearings on the same afternoon.
              One job gets the parts; the other discovers the shortfall when the motor is already torn down. With
              reservation, the second quote sees less available to promise because the first approval already claimed
              quantity, preventing a double-promise against the same physical part before either work order hits the
              floor.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Inventory reservations and consumption follow the quote-backed path through to delivery. The work order
              is not a disconnected parts list someone typed later; it carries line items from the primary final
              quote, with numbering aligned to the job so floor and office reference the same ID. When you ask “which
              job owns these seals?” the answer is the approved quote reservation, not a guess from whoever last
              walked the aisle. How that work order is created and tracked is covered on the{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software for motor repair shops
              </Link>{" "}
              page. How those same line items become invoices without re-keying is on{" "}
              <Link href={SEO_SOFTWARE_INVOICING_PATH} className="text-primary font-medium hover:underline">
                motor repair invoicing and quoting software
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Shortfalls, vendor POs, and purchasing in the same flow
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Reservation only helps if you can act when the catalog says you are short. When a quote needs a part
              that is not available to promise, shortfalls can generate a vendor purchase order directly from the quote
              screen. You are not copying SKUs into a separate purchasing app and hoping the PO still matches what the
              customer approved. The PO is tied to a vendor you already keep on file.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Vendor management and purchasing live in this same shop system, there is no separate “vendor product”
              page in this cluster because the work happens on the quote and PO path. Per supplier you store contact
              and terms. Purchase orders are created for parts and materials the job needs. Vendor invoices attach to
              those POs. PO status is tracked as open, invoiced, or paid so the office can see whether the parts order
              is still waiting, already billed by the supplier, or settled, without a parallel spreadsheet labeled
              “POs this month.”
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Receiving ties the physical delivery back to the relevant PO: vendor deliveries against purchase orders
              are logged with the same chain that tracks customer motors arriving and shipments back to customers.
              That gives a practical answer to “did that order come in?” and “where is it right now?” instead of
              checking email threads for packing slips. When the parts land and on-hand increases, you are still in
              the same inventory and purchasing record set that started from the quote shortfall, not three systems
              that disagree by the end of the week.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              This matters for repair shops because parts buys are job-driven, not forecast-driven like a retail
              parts house. You buy because an approved quote reserved more than you had free, or because the quote
              never had stock in the first place. Starting the PO from the quote screen keeps the purchase tied to
              that job’s need. Contacts and terms on the vendor record keep the counter from hunting for a phone
              number every time the same supplier gets another rush order. Status on the PO, open, invoiced, or
              paid, keeps purchasing and AP on one object instead of a folder of PDFs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Automatic consumption when the work order ships
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Reservation holds quantity for the job. Consumption is what happens when the work leaves. When a work
              order ships, consumed quantities are automatically deducted from inventory. There is no second pass
              where someone opens a stock spreadsheet and subtracts what they think went into the motor. The
              quote-backed line items that reserved parts are the same path that settles the stock when delivery
              happens.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That is the difference between “we think the shelf matches the books” and “the books moved when the
              shipment logged.” Manual double-entry is where counts drift: the floor used two seals, the office
              forgot to edit the sheet, and three weeks later the next job is promised against a ghost quantity. Automatic
              deduction on shipment closes that loop for the quantities that followed the work order.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Shipping and receiving stay linked to the work order or PO involved, so the logistics record and the
              inventory movement are not two unrelated stories. Customer motors in, vendor deliveries against POs,
              and shipments back to customers all answer custody questions. Inventory consumption on shipment is the
              stock-side half of that same discipline: if it shipped on the work order, the catalog should reflect
              the use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Low-stock alerts on the dashboard
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Low-stock alerts surface on the dashboard so the office does not discover a problem only when the next
              quote cannot be promised. You still run the shop from jobs and quotes, the alert is a visibility layer
              on parts that need attention before another approval burns through what little available-to-promise
              remains. Combined with on-hand and reserved counts in the catalog, the dashboard answer is clearer than
              walking the aisle after a customer is already waiting on a date.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Alerts do not replace the shortfall-to-PO path from the quote screen. They catch the slow bleed:
              common consumables and high-turn items that drop while several jobs are open. When an alert fires, you
              still use vendor contacts, terms, and purchase orders in the same purchasing flow described above, not a
              separate “reorder app” that never sees the jobs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Optional bin and aisle locations</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The parts catalog can store an optional bin or aisle location for each SKU. That field is optional on
              purpose. Some shops pick by labeled rack and want the location on the part record; others run a smaller
              cage and do not need software to say “third shelf left.” On-hand, reserved, available to promise,
              shortfall POs, low-stock alerts, and automatic consumption on shipment all work whether or not you fill
              in bin and aisle. Use location when it helps picking; leave it blank when it would only be clutter.
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
              Pricing is custom, monthly, yearly, or one-time, matched to how your shop runs. There is no self-serve
              signup on a public rate card. Use the form to book a demo and see on-hand, reserved, quote shortfalls,
              vendor POs, and shipment consumption on your own parts list. For the broader system around inventory,
              read{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management software
              </Link>
              ,{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software for motor repair shops
              </Link>
              , and{" "}
              <Link href={SEO_SOFTWARE_INVOICING_PATH} className="text-primary font-medium hover:underline">
                motor repair invoicing and quoting software
              </Link>
              .
            </p>
          </section>

          <SoftwareClusterLinks excludeHref={path} />
        </article>
      </BlogPageLayout>
    </>
  );
}
