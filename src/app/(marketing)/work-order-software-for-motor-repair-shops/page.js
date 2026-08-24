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
} from "@/lib/seo-software-paths";

const path = SEO_SOFTWARE_WORK_ORDER_PATH;

const TITLE = "Work Order Software for Electric Motor Repair Shops | IQMotorBase";
const DESCRIPTION =
  "Work orders that stay linked to the job number, the quote, and the parts reserved for it. See how motor repair shops track jobs from intake to delivery.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "motor repair work order software",
    "electric motor work order software",
    "motor repair job tracking software",
    "motor repair job management software",
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
    q: "How is a work order created in IQMotorBase?",
    a: "A work order is created from the job’s primary final quote—not typed up as a separate disconnected object. Motor details, customer, scope, and line items carry through automatically, and numbering stays aligned to the job number so the floor and office reference the same ID.",
  },
  {
    q: "Can technicians update work orders from the shop floor?",
    a: "Yes. A Tag QR printed from the Job Write-Up encodes the job number. Technicians scan it with the mobile app to open the correct work order, update job status, and log motor testing notes and values from the floor. The office sees those updates on the same job board in real time.",
  },
  {
    q: "What happens to inventory when a work order ships?",
    a: "Inventory reservations follow the quote-backed path into the work order. When a work order ships, consumed quantities are automatically deducted from inventory—no manual double-entry of what left the shelf.",
  },
  {
    q: "How is this different from generic work order software?",
    a: "Generic work order tools are built for broad repair-order forms. IQMotorBase work orders sit on the same job path as the Job Write-Up and quote, carry motor details and quote line items, support Tag QR floor updates with motor testing notes and values, and tie inventory reservation and consumption to delivery. That chain is built for electric motor and rewind shops.",
  },
];

export default function WorkOrderSoftwareForMotorRepairShopsPage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Work order software for electric motor repair shops"
        description="Work orders linked to the job number, the quote, and the parts reserved for it—so the floor and office stop working from different versions of the same job."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarTitle="Book a demo"
        sidebarDescription="Custom pricing for your shop’s workflow. Tell us who you are and we’ll follow up."
        sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              In a motor repair shop, the work order is supposed to be the single answer to “what are we doing on this
              motor?” Too often it is not. The quote says one scope. The parts shelf was reserved—or not—against a
              different list. The technician did something else because the paper WO on the bench was printed before
              the final quote settled. By the time the job ships, nobody can say which document was authoritative.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That drift is the problem this page is about. IQMotorBase work orders are created from the job’s primary
              final quote, stay numbered to the same job as the Job Write-Up, carry motor details and line items
              through automatically, and sit on a job board the office and floor share. Inventory reservation and
              consumption follow that same quote-backed path through to delivery. If you want the full shop system
              map—write-ups, leads, invoicing, and the rest—start at{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management software
              </Link>
              . Here we stay on the work order and how jobs move from intake to delivery without losing the thread.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              How a work order is created from the job’s primary final quote
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Every repair in IQMotorBase starts as a Job Write-Up with its own job number. Intake, inspection notes,
              preliminary and final quotes, customer send, attachments, and shop actions live on that continuous
              record. Formal RFQs start from the Job Write-Up and stay linked to the same job number. You are not
              building a “work order job” in one tool and a “quote job” in another.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The work order itself is created from the job’s primary final quote—not typed up as a separate
              disconnected object. That matters mechanically. Motor details, customer, scope, and line items carry
              through automatically from what was already agreed on the quote path. Nobody is re-keying horsepower,
              frame, serial number, or customer billing lines into a blank WO form after the customer already signed
              off. The quote line items that pulled from the shop’s parts catalog are the same items the floor sees
              when the work order opens.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Numbering stays aligned to the job number so the floor and office reference the same ID. When someone
              asks “where is job 4821?” they are not translating between a quote number, a WO number, and a sticky note
              on the rack. The Job Write-Up shop actions include generating the work order and printing the Tag QR for
              that same job. From the counter’s point of view, generate work order is a step on the continuous
              record—not a handoff into a second system with its own identity scheme.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That quote-backed creation path is also why inventory can follow the job without a second reservation
              ritual. Parts reserved when the quote was approved stay tied to the work that the work order represents.
              When you later invoice from completed work orders and approved quote line items, amounts match what was
              agreed—because the WO was never a free-floating list someone typed from memory. For how customers and
              motors persist across visits so that history is available when you quote, see{" "}
              <Link href={SEO_SOFTWARE_CRM_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management system
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              The job board: status columns the shop can see in real time
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Once work orders exist, the shop still needs a shared picture of where each motor sits. IQMotorBase
              includes a visual job board (shop floor board) with status columns. Example columns include Received,
              Inspection, Rewinding, Testing, and Ready—columns are configurable, so treat that list as a starting
              shape rather than a fixed plant layout. The point is not a pretty kanban for its own sake; it is one
              board where a manager can see WIP without walking the aisle or calling every station.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Jobs move between statuses by drag or tap. A motor that finished inspection moves into rewinding without
              someone rewriting a whiteboard and hoping the office spreadsheet gets the same update. When technicians
              change status from the floor via mobile, the office sees those updates in real time on the same board.
              That closes the classic lag where the counter thinks a job is still in testing because the last paper
              update never made it back to the desk.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For a shop owner, the board answers operational questions: how many motors are waiting on inspection,
              what is stuck before ready, where capacity is piling up. Reports elsewhere in the product cover revenue,
              completed jobs, and technician workload for longer-range planning; the board is the live floor view. It
              sits on the same job identity as the work order and Job Write-Up, so a card on the board is not a third
              naming system. Status stays attached to the job everyone already uses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Mobile and Tag QR: open the right work order from the floor
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Paper travelers get lost. Verbal updates get paraphrased. IQMotorBase’s Tag QR workflow is built to cut
              that out. From the Job Write-Up, the shop prints a Tag QR that encodes the job number. That tag goes
              with the motor—on the rack, on the stand, wherever your shop already hangs identification. The encoding
              is the job number, not a separate WO alias that has to be crosswalked later.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              On the floor, a technician scans the Tag QR with the mobile app. The scan opens the correct work order.
              No walking back to a desk to hunt a job number in a browser tab. No guessing which of three similarly
              named customer motors is on the hoist. From that open work order, the technician updates job status and
              logs motor testing notes and values directly from the floor. Those updates are what the office sees on
              the job board in real time—same job, same status path.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Why this matters operationally is straightforward. Test data entered at the bench is less likely to be
              reinvented at the end of the day from a crumpled slip or from memory after three other motors. Status
              moves when the work moves, not when someone finds time to type. The work order the tech sees is the one
              that was generated from the primary final quote, so scope and line items match what the office sold.
              That is the difference between “we have a mobile app” and “the floor is editing the same job record the
              counter uses.”
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For a shop-floor-first look at the technician side of that workflow, see{" "}
              <Link
                href="/technician-mobile-app-shop-floor-first"
                className="text-primary font-medium hover:underline"
              >
                technician mobile app (shop floor first)
              </Link>
              . The Tag QR path described here is the same product mechanic: print from Job Write-Up, scan, open work
              order, update status and testing notes without a desk trip.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Inventory tie-in: reservation and consumption through the work order
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Parts are where disconnected work orders quietly break shops. Someone quotes bearings and wire from the
              catalog. Another job gets promised the same physical stock because nothing reserved it. Or the job ships
              and inventory still shows full on-hand because nobody subtracted what left with the motor. IQMotorBase
              ties inventory to the quote-backed work order path instead of treating stock as a separate end-of-day
              chore.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              When a quote is approved, parts on that quote get reserved. On-hand minus reserved is what remains
              available to promise to other jobs. Shortfalls can generate a vendor PO directly from the quote screen
              when you need something that is not in stock. Reservations and consumption then follow that quote-backed
              path through the work order to delivery. When a work order ships, consumed quantities are automatically
              deducted from inventory—no manual double-entry.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The shop’s parts catalog carries SKU, unit of measure, on-hand count, reserved count, and optional
              bin/aisle location. Low-stock alerts surface on the dashboard so you are not discovering a zero only when
              a winder asks for wire. That full reservation and available-to-promise mechanic is covered in depth on{" "}
              <Link href={SEO_SOFTWARE_INVENTORY_PATH} className="text-primary font-medium hover:underline">
                motor repair inventory software
              </Link>
              . On this page, the takeaway for work orders is simpler: shipping the WO is the consumption event, and
              the parts path started when the quote reserved stock against that same job.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Why generic work order tools don’t fit motor repair
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Generic work order software is usually a repair-order form built for broad service businesses—oil
              changes, facility tickets, generic “labor + parts” lines. You can force a motor job into those fields,
              but motor test data does not belong in a comments box. Voltage readings, insulation resistance, and
              other bench values need to live on the work order itself so the next visit, the invoice path, and the
              motor registry can find them. [NEEDS INPUT: confirm exact named test fields on the work order UI before
              listing them as product labels.]
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase keeps that data on the motor-and-job path: technicians log testing notes and values from
              mobile against the work order opened by Tag QR; the motor registry persists serial number, specs,
              service history, and test results across repeat visits. Work orders are not a blank RO—they are generated
              from the primary final quote with motor details, customer, scope, and line items already attached.
              Inventory reservation and automatic consumption on shipment are part of that same chain. A generic WO
              tool that never sat on a Job Write-Up will always ask you to retype what the quote already knew—and leave
              motor test values as optional notes instead of floor-updated job data.
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
              There is no self-serve signup on a published price list. Pricing is custom—monthly, yearly, or
              one-time—matched to how your shop runs. Use the form to book a demo and see work orders created from the
              primary final quote, the job board, Tag QR floor updates, and inventory consumption on shipment. For the
              full product map, return to{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management software
              </Link>
              .
            </p>
          </section>

          <SoftwareClusterLinks
            excludeHref={path}
            extraLinks={[
              { href: "/technician-mobile-app-shop-floor-first", label: "Technician mobile app (shop floor first)" },
            ]}
          />
        </article>
      </BlogPageLayout>
    </>
  );
}
