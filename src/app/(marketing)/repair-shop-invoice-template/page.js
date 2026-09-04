import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import SoftwareSeoFaqJsonLd from "@/components/marketing/SoftwareSeoFaqJsonLd";
import SoftwareClusterLinks from "@/components/marketing/SoftwareClusterLinks";
import TemplateFieldSpec from "@/components/marketing/template-field-spec";
import {
  SEO_SOFTWARE_PILLAR_PATH,
  SEO_SOFTWARE_INVOICING_PATH,
  SEO_INVOICE_TEMPLATE_PATH,
  SEO_WORK_ORDER_TEMPLATE_PATH,
} from "@/lib/seo-software-paths";

const path = SEO_INVOICE_TEMPLATE_PATH;

// The root layout applies a "%s | IQMotorBase" template, so the brand suffix is
// omitted here; SOCIAL_TITLE carries it because og:/twitter: titles skip the template.
const TITLE = "Repair Shop Invoice Template (Free)";
const SOCIAL_TITLE = `${TITLE} | IQMotorBase`;
const DESCRIPTION =
  "A free repair shop invoice template built for motor and rewind work: labor, parts, outside services, core charges, and the fields that stop plants from short-paying you.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "invoice template repair shop",
    "repair shop invoice template",
    "motor repair invoice template",
    "electric motor repair invoice",
    "rewind shop billing template",
  ],
  openGraph: {
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const faqItems = [
  {
    q: "What should a repair shop invoice include?",
    a: "Your details and tax registration, the customer's billing entity and PO number, the job number that matches the work order, the equipment identified by serial number, itemized labor and parts, any outside services and freight, tax, payment terms, and how to pay. For motor work, adding the before-and-after test readings to the invoice measurably reduces disputes.",
  },
  {
    q: "Should I itemize labor and parts separately on a repair invoice?",
    a: "Yes for industrial customers — most plants require itemization to process the payment at all, and a lump sum invites a call from purchasing that delays payment by weeks. The exception is a fixed-price quote the customer already approved, where you invoice the agreed total and attach the itemized detail as backup.",
  },
  {
    q: "What payment terms do motor repair shops normally use?",
    a: "Net 30 is the industrial default. Shops commonly use 50% deposit on rewinds over a threshold amount, net 15 or COD for new accounts, and a stated late-fee percentage. The important part is that the terms appear on the quote, the work order, and the invoice — terms that first appear at billing are the ones that get argued about.",
  },
  {
    q: "Why do repair invoices get short-paid?",
    a: "Almost always a missing PO number, a total that exceeds the approved not-to-exceed amount without a documented change approval, or line items the plant cannot match to what they authorized. All three are paperwork failures upstream of billing, which is why the invoice should be generated from the approved work order rather than typed fresh.",
  },
];

const groups = [
  {
    name: "1. Your details",
    intro: "Boring, and the reason invoices get returned. Accounts payable cannot pay an entity it cannot match to its vendor master.",
    fields: [
      { field: "Legal business name", holds: "The name on your vendor registration, not your trading name if they differ.", required: true },
      { field: "Address & contact", holds: "Remit-to address plus a phone number and email for billing queries.", required: true },
      { field: "Tax ID / registration", holds: "EIN, VAT, GST, or local equivalent. Required in most jurisdictions for the customer to claim the expense.", required: true },
      { field: "Invoice number", holds: "Sequential and unique. Gaps and reused numbers cause audit problems.", required: true },
      { field: "Invoice date & due date", holds: "State both. \"Net 30\" alone leaves the due date open to interpretation.", required: true },
    ],
  },
  {
    name: "2. Customer & job reference",
    intro: "This block is what a plant's AP clerk matches against their system. Every missing field here is a week of delay.",
    fields: [
      { field: "Bill-to entity", holds: "The legal entity that issued the PO — often a different company than the plant that shipped you the motor.", required: true },
      { field: "Ship-to / site", holds: "Where the repaired unit went, if different from bill-to.", required: true },
      { field: "Customer PO number", holds: "The single most common reason industrial invoices are rejected. Get it at intake.", required: true },
      { field: "Job / work order number", holds: "The same number as your work order, so the customer can tie the invoice to what they approved.", required: true },
      { field: "Equipment identified", holds: "Manufacturer, HP/kW, frame, and serial number. Never bill \"one motor repaired.\"", required: true },
    ],
  },
  {
    name: "3. Labor",
    fields: [
      { field: "Operation description", holds: "Strip and clean, rewind, machining, bearing replacement, balance, assembly, testing — one line each.", required: true },
      { field: "Hours", holds: "Actual hours by operation, from the work order.", required: true },
      { field: "Rate", holds: "Your shop rate. Show straight-time and overtime or field-service rates separately if they differ.", required: true },
      { field: "Line total", holds: "Hours multiplied by rate, per operation.", required: true },
    ],
  },
  {
    name: "4. Parts & materials",
    fields: [
      { field: "Part number & description", holds: "Bearings, seals, magnet wire, insulation, varnish, hardware.", required: true },
      { field: "Quantity & unit price", holds: "Selling price, not your cost. Consumables can be grouped as one shop-materials line.", required: true },
      { field: "Line total", holds: "Extended price per line.", required: true },
    ],
  },
  {
    name: "5. Other charges",
    intro: "The lines shops forget to bill. Each one is money already spent.",
    fields: [
      { field: "Outside services", holds: "Machining, dynamic balancing, plating, specialist testing sent out to a vendor.", required: false },
      { field: "Freight in / out", holds: "Inbound collection and outbound delivery, listed separately from the repair.", required: false },
      { field: "Rigging / crane / field labor", holds: "Site work, removal, and reinstallation, with travel time and mileage.", required: false },
      { field: "Core charge / scrap credit", holds: "A credit line if you retained the old core or salvage.", required: false },
      { field: "Inspection fee", holds: "Where a motor was stripped and quoted but the customer declined the repair.", required: false },
      { field: "Storage", holds: "For units left past your stated collection window. Only bill it if the term was disclosed.", required: false },
    ],
  },
  {
    name: "6. Totals, terms & payment",
    fields: [
      { field: "Subtotal, tax, total due", holds: "Show the tax rate applied, and mark any exempt lines with the exemption reference.", required: true },
      { field: "Deposit / progress payments", holds: "Amounts already received, deducted to give the true balance.", required: true },
      { field: "Payment terms", holds: "Net 30, net 15, COD. Must match what was on the quote and work order.", required: true },
      { field: "Late fee policy", holds: "A stated monthly percentage. Unstated late fees are unenforceable in practice.", required: false },
      { field: "How to pay", holds: "Bank details, cheque payee, or card link. Make it impossible to have to ask.", required: true },
      { field: "Warranty statement", holds: "Duration and coverage, repeated from the work order.", required: true },
      { field: "Test results summary", holds: "Before-and-after insulation resistance and the no-load run figures. Optional, and the single best anti-dispute field on the page.", required: false },
    ],
  },
];

const plainText = `INVOICE

[Your legal business name]
[Street, city, postcode]        Tax ID / EIN: ______________
Billing contact: ____________   Phone: _____________________

Invoice No: ______________      Invoice date: ______________
                                Due date:     ______________

BILL TO                          SHIP TO / SITE
_______________________          _______________________
_______________________          _______________________
_______________________          _______________________

Customer PO: ______________     Job / WO No: ______________
Equipment: ______ HP  Frame ______  Serial ________________
Manufacturer: _____________________________________________

--- LABOR --------------------------------------------------
Description                       Hours    Rate      Amount
Strip, clean & inspect            _____   ______    _______
Rewind                            _____   ______    _______
Machining / bearing fits          _____   ______    _______
Assembly & balance                _____   ______    _______
Final testing                     _____   ______    _______
                                        Labor total  _______

--- PARTS & MATERIALS --------------------------------------
Part no.      Description         Qty   Unit       Amount
__________    ________________   ____   ______    _______
__________    ________________   ____   ______    _______
                                        Parts total  _______

--- OTHER CHARGES ------------------------------------------
Outside services: _________________________       _______
Freight in / out                                  _______
Rigging / field labor                             _______
Core charge / scrap credit                       (_______)
                                        Other total  _______

--- TOTALS -------------------------------------------------
                                 Subtotal          _______
                                 Tax  ______ %     _______
                                 Less deposit     (_______)
                                 TOTAL DUE         _______

Terms: Net ______ days.  Late fee ______ % per month.
Warranty: ______ months covering ___________________________

Test results:  Incoming IR ______ Mohm  ->  Final ______ Mohm
No-load run:  U ______  V ______  W ______ amps

Remit to: __________________________________________________
Bank / account: ____________________________________________
Questions about this invoice: ______________________________`;

export default function RepairShopInvoiceTemplatePage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Repair shop invoice template"
        description="An invoice built for motor and rewind work — itemized labor, parts, outside services, core credits, and the reference fields that stop industrial customers from short-paying you. Free to copy, no sign-up."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarTitle="Getting paid faster"
        sidebarDescription="See how invoices generated from the approved work order cut the disputes this template is designed to prevent."
        sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              A repair shop invoice has a harder job than a retail one. It has to survive an industrial accounts
              payable department that will match it against a purchase order, an approved quote, and a receiving note
              before anyone signs a cheque. Miss the PO number and it sits in a queue. Exceed the approved amount
              without documented authorization and it gets short-paid. Bill &ldquo;motor repair &mdash; $4,200&rdquo;
              as one line and purchasing calls you instead of paying you.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The template below is structured to clear those hurdles: full reference block, itemized labor and parts,
              separate lines for the outside services and freight that shops routinely absorb by accident, and a
              test-results summary that quietly ends most quality disputes. It pairs with the{" "}
              <Link href={SEO_WORK_ORDER_TEMPLATE_PATH} className="text-primary font-medium hover:underline">
                motor repair work order template
              </Link>{" "}
              &mdash; same job number, same equipment block, so the invoice reconciles to what was authorized.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">The template, field by field</h2>
            <div className="mt-6">
              <TemplateFieldSpec groups={groups} plainText={plainText} copyLabel="Copy invoice template" />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-12">
              Four billing lines shops forget, every month
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Outside services.</strong> A rotor goes out for dynamic balancing, the
              vendor invoice arrives two weeks later, and by then the customer invoice has already gone. The cost sits
              in overhead permanently. Put the line on the invoice template so it has to be answered, even if the
              answer is zero.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Freight.</strong> Collecting a 400&nbsp;kg motor is not free, and shops
              swallow it to seem accommodating. Bill it as a visible line and let the customer decide whether to
              arrange their own transport.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Inspection fees on declined repairs.</strong> Stripping and testing a
              motor takes real hours. When the customer decides to buy new instead, those hours are still yours to
              bill &mdash; provided the teardown authorization said so up front.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Deposits actually received.</strong> Forgetting to deduct a deposit is the
              one error that gets noticed immediately, and it costs you credibility on every other line of the
              invoice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              When retyping invoices becomes the problem
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Every field in this template already exists on the work order. Typing it a second time is how the invoice
              total drifts from the approved amount, how a serial number gets a digit wrong, and how parts issued to a
              job never make it onto the bill at all. The failure is not carelessness; it is that manual re-entry has a
              predictable error rate and rewind shops run too many jobs for it to stay small.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Generating the invoice from the approved work order removes the step entirely, which is what{" "}
              <Link href={SEO_SOFTWARE_INVOICING_PATH} className="text-primary font-medium hover:underline">
                motor repair invoicing and quoting software
              </Link>{" "}
              is for, sitting on the same job record as the rest of the{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                shop management system
              </Link>
              . Until then, this template will do the job perfectly well &mdash; use it, and switch when the retyping
              starts costing more than it saves.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Frequently asked questions</h2>
            <dl className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div key={item.q}>
                  <dt className="text-lg font-semibold text-title">{item.q}</dt>
                  <dd className="mt-2 text-secondary leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <SoftwareClusterLinks excludeHref={path} />
        </article>
      </BlogPageLayout>
    </>
  );
}
