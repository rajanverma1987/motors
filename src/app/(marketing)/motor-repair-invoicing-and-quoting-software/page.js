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

const path = SEO_SOFTWARE_INVOICING_PATH;

const TITLE = "Motor Repair Invoicing & Quoting Software | IQMotorBase";
const DESCRIPTION =
  "Quotes that become invoices without re-keying line items. Track receivables, payments, and sales commissions—and sync customers, invoices, payments, and vendor POs to QuickBooks Online.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "motor repair estimate software",
    "motor repair quotation software",
    "motor repair job costing software",
    "motor repair invoicing software",
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
    q: "Can a quote turn into an invoice without retyping line items?",
    a: "Yes. Invoices are generated from completed work orders and approved quote line items, so amounts match what was agreed. Extra charges or adjustments can be added after the fact and still link into accounts receivable—no rebuilding the bill from a paper quote or a separate spreadsheet.",
  },
  {
    q: "Do quote line items show whether parts are actually available?",
    a: "Quote lines can pull from the shop’s parts catalog, which tracks SKU, unit of measure, on-hand, and reserved counts. Available-to-promise (on-hand minus reserved) is visible when you build the quote. Shortfalls can start a vendor purchase order from the quote screen instead of guessing stock elsewhere.",
  },
  {
    q: "How do payments and past-due accounts show up?",
    a: "Payment tracking includes online payment links and payment history. Aging reports surface past-due accounts for follow-up without exporting AR to a spreadsheet. Invoices stay on the same job path as the quote and work order.",
  },
  {
    q: "Does IQMotorBase sync invoices to QuickBooks Online?",
    a: "Yes. Connect QuickBooks Online under Settings → Accounts. When a job reaches the closed status you choose, customers, invoices, payments, and vendor purchase orders sync to QBO so the office does not retype RFQ lines or payments into accounting.",
  },
];

export default function MotorRepairInvoicingAndQuotingSoftwarePage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Motor repair invoicing and quoting software"
        description="Quotes that become invoices without re-keying line items. Track receivables, payments, and sales commissions on the same job record—and sync to QuickBooks Online when a job closes."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarTitle="Book a demo"
        sidebarDescription="Custom pricing for your shop’s workflow. Tell us who you are and we’ll follow up."
        sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              In a motor repair shop, the money side of the job fails the same way the floor side fails: when the
              quote, the work, and the invoice live in three places. Someone retypes RFQ lines into QuickBooks. Someone
              else adds freight or rush labor on a sticky note. Receivables sit in a spreadsheet nobody trusts after the
              last partial payment. Sales commissions get calculated later from memory or a stack of closed tickets. By
              the time the customer asks what they were quoted versus billed, the office is reconstructing the story
              instead of reading it.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase keeps quoting, invoicing, receivables, and job-level sales commission data on the same Job
              Write-Up path as intake and the work order. Formal RFQs start from that job, stay linked to the job
              number, and convert into invoices from completed work orders and approved quote lines—without re-keying
              what was already agreed. When you enable QuickBooks Online, that same commercial path can sync customers,
              invoices, payments, and vendor POs into QBO the moment a job hits your chosen closed status. This page
              walks that path for shops done babysitting disconnected estimate and billing tools. For the full system,
              see{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management software
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Quotes (RFQs): started from the Job Write-Up, not a blank estimate pad
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Every repair in IQMotorBase starts as a Job Write-Up with its own job number. That record holds intake,
              inspection notes, preliminary and final quotes in the pipeline, customer send, job-level attachments,
              sales commission data, and shop actions such as print, generate work order, and generate Tag QR. Quotes
              are not a separate product bolted on later. A formal RFQ is started from the Job Write-Up so the quote
              stays linked to the same job number the floor will use when the work order is cut.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That link matters when purchasing asks which job a bearing is for, or when a customer calls about revision
              two of an estimate. The office does not hunt for a quote number that never matched a job ticket. The RFQ
              is editable after it is created—scope changes, parts swaps, labor adjustments—without inventing a second
              “real” estimate elsewhere. Status is tracked on the quote itself, so you see where each RFQ sits in the
              pipeline instead of inferring status from email threads.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Line items can pull directly from the shop’s parts catalog. The catalog carries SKU, unit of measure,
              on-hand count, reserved count, and optional bin or aisle location. When you build a quote from catalog
              parts, you see live stock posture—not last month’s printed inventory sheet. Available to promise is
              on-hand minus reserved, the number that matters when two jobs want the same sleeve bearing. How reservation
              locks on approval and how shortfalls open a vendor PO from the quote screen is on{" "}
              <Link href={SEO_SOFTWARE_INVENTORY_PATH} className="text-primary font-medium hover:underline">
                motor repair inventory software
              </Link>
              ; the quoting point here is simpler: the estimate is built from the same parts book the stockroom uses,
              with availability visible while you price the job.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Preliminary and final quotes both live on the Job Write-Up pipeline. Shops that send a rough number after
              inspection and a tighter number after teardown are not maintaining two customer files. Customer send sits
              on the same record, so the RFQ that left the shop is tied to that job number. When the primary final quote
              becomes floor work, the work order is created from that quote—motor details, customer, scope, and line
              items carry through, numbering aligned to the job. That handoff is covered on{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software for motor repair shops
              </Link>
              ; for invoicing, billing later starts from the same approved lines, not a retyped summary of what the
              technician “probably” did.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Quote to invoice: completed work orders and approved lines, not a second bill
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Invoices in IQMotorBase are generated from completed work orders and approved quote line items. Amounts
              match what was agreed on the quote path—there is no manual re-entry of every labor and parts line into a
              separate billing tool. That fixes the common rewind-shop fight: the customer approved a number, the floor
              shipped the motor, and the invoice matches neither document because someone rebuilt it under deadline.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The sequence is mechanical. The job carries preliminary and final quotes. The work order comes from the
              job’s primary final quote, so scope and lines are already the agreed basis. When you generate the invoice
              from that completed work order and those approved quote lines, the bill inherits the commercial agreement
              instead of approximating it. Inventory consumption on shipment follows the quote-backed path on the
              work-order side; invoicing does not need a second pass to invent parts used just to post a receivable.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Extra charges and adjustments can still be added after the fact when reality differs from the quote—
              freight, rush, additional labor at assembly, a parts substitution the customer approved. Those adjustments
              link to accounts receivable with the rest of the invoice. You are not parking “extras” in a side notebook
              that never posts, or opening a blank invoice and hoping every add-on is remembered. Quote agreed, work
              done, bill issued, AR open—same job story.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Shops that already run a dedicated accounting package are not forced to rip it out on day one. An API can
              sync customers, work orders, and quotes with external CRM, accounting, or ERP tools—one operational source
              of truth while the shop keeps apps the team already uses. The claim here is narrower: inside IQMotorBase,
              approved quote lines through completed work order to invoice do not require re-keying commercial detail
              that already lives on the job.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Accounts receivable and payment tracking on the same job path
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Once the invoice exists, the shop still has to collect. IQMotorBase includes payment tracking and aging
              reports for follow-up on past-due accounts. That sounds basic until you have watched a shop chase money
              from a folder of printed invoices and a bank deposit list that never quite reconciles to open jobs. Here
              the receivable stays connected to the invoice that came from the completed work order and approved quote
              lines—so when collections asks “what job is this?” the answer is the same job number the floor used.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Aging reports are the practical tool for the office manager who starts the week by asking which accounts
              are late. Instead of exporting AR to a spreadsheet and sorting by hand, the aging view surfaces past-due
              balances for follow-up. Payment history sits with that tracking so a partial payment last month is not
              tribal knowledge held by one person who remembers the phone call. Online payment links are part of payment
              tracking: the shop can send a link rather than waiting on a check that “is in the mail” every Friday.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              None of this replaces your judgment about credit terms. It replaces treating invoicing as a dead end after
              the motor ships. The customer registry already holds billing details and full job history; invoice and
              payment activity belong in that same commercial picture. When a repeat customer’s motor comes back, you
              can see whether the last job paid cleanly before you extend the same terms again—quoted, billed, and
              collected on one job number.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For shops still splitting estimate software, job tickets, and an AR spreadsheet, the failure mode is
              predictable: quotes win the work, work orders move the motor, and billing is a third system rebuilt after
              the fact. IQMotorBase’s AR features cover day-to-day collection on jobs that already live in the product.
              Floor mechanics behind the completed work order are on the{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software
              </Link>{" "}
              page; reserved stock and shortfalls that break quote accuracy before you invoice are on{" "}
              <Link href={SEO_SOFTWARE_INVENTORY_PATH} className="text-primary font-medium hover:underline">
                inventory software
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              QuickBooks Online: shop floor to books without re-keying
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase includes a built-in QuickBooks Online (QBO) integration. Connect your company under Settings
              → Accounts, choose which work-order status counts as “job closed,” and turn sync on. When a job reaches
              that status—or when you save invoices, payments, customers, and vendor purchase orders—IQMotorBase can
              push the matching records into QuickBooks Online.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That is the opposite of the old habit: export a PDF, open QBO in another tab, and type customer names,
              line items, and payment amounts again. Sync is one-way from IQMotorBase into QBO so the shop system stays
              the operational source of truth while accounting still lives where your bookkeeper expects it.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For inventory reservations that feed quote accuracy before you invoice, see{" "}
              <Link href={SEO_SOFTWARE_INVENTORY_PATH} className="text-primary font-medium hover:underline">
                motor repair inventory software
              </Link>
              . Floor status that drives “job closed” is covered on{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software for motor repair shops
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Sales commissions at the job level</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The Job Write-Up carries sales commission data on the same continuous record as intake, quotes, and shop
              actions. Commissions are tracked at the job level—not as a disconnected spreadsheet rebuilt from closed
              invoices at month-end. When the office looks at a job, commission information sits with the commercial
              path that produced the quote and the invoice, so you are not reverse-engineering who owned the sale from
              email or from a handwritten note on the traveler.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              [NEEDS INPUT: how commission percentage, splits, or rules are configured in-product—Section 1 confirms
              job-level sales commission data on the Job Write-Up but does not document the configuration UI, rate
              tables, or payout calculation mechanics.] Until that detail is confirmed, treat commissions as present on
              the job record and part of the quoting/invoicing story, not as a fully specified commission engine claim.
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
              There is no self-serve signup on a published rate card. Pricing is custom—monthly, yearly, or one-time—
              matched to how your shop runs quotes, work orders, and collections. Use the form on this page to book a
              demo and get pricing. If you want the broader product map first, read{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management software
              </Link>
              , then come back to how RFQs, invoices, and AR sit on the same job number.
            </p>
          </section>

          <SoftwareClusterLinks excludeHref={path} />
        </article>
      </BlogPageLayout>
    </>
  );
}
