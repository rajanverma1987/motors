import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import SoftwareSeoFaqJsonLd from "@/components/marketing/SoftwareSeoFaqJsonLd";
import SoftwareClusterLinks from "@/components/marketing/SoftwareClusterLinks";
import TemplateFieldSpec from "@/components/marketing/template-field-spec";
import {
  SEO_SOFTWARE_PILLAR_PATH,
  SEO_SOFTWARE_WORK_ORDER_PATH,
  SEO_INVOICE_TEMPLATE_PATH,
  SEO_WORK_ORDER_TEMPLATE_PATH,
} from "@/lib/seo-software-paths";

const path = SEO_WORK_ORDER_TEMPLATE_PATH;

// The root layout applies a "%s | IQMotorBase" template, so the brand suffix is
// omitted here; SOCIAL_TITLE carries it because og:/twitter: titles skip the template.
const TITLE = "Motor Repair Work Order Template (Free)";
const SOCIAL_TITLE = `${TITLE} | IQMotorBase`;
const DESCRIPTION =
  "A free electric motor repair work order template: every field a rewind shop needs, what belongs in each one, and a plain-text version to copy. No sign-up.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "work order template motor repair",
    "motor repair work order template",
    "electric motor repair work order form",
    "motor rewind work order template",
    "repair shop work order form",
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
    q: "What should a motor repair work order include?",
    a: "At minimum: job number, customer and PO, full motor nameplate data, incoming test readings, the authorized scope with a dollar limit, parts and materials used, labor hours by technician, final test results, and a customer sign-off line. The nameplate block and the incoming readings are what separate a motor repair work order from a generic repair order — without them you cannot prove what condition the motor arrived in.",
  },
  {
    q: "What is the difference between a work order and a job card?",
    a: "A work order authorizes the work and carries the commercial terms — scope, approval limit, customer PO. A job card travels with the motor through the shop and records what each department actually did. Small shops often combine them into one printed sheet; larger shops keep the work order at the counter and the job card on the bench.",
  },
  {
    q: "Do I need a signed work order before starting a rewind?",
    a: "You want written authorization with a dollar limit before any teardown that cannot be reversed. Disassembly and inspection are usually quoted as a separate, smaller authorization, because you cannot price the rewind until the core is stripped and tested. The template below splits those into two approval lines for that reason.",
  },
  {
    q: "Is this work order template free?",
    a: "Yes. Copy the plain-text version and use it however you like — there is no download gate and no sign-up. If retyping it onto paper for every job becomes the bottleneck, that is the point at which shops move to work order software instead.",
  },
];

const groups = [
  {
    name: "1. Header — who, what, when",
    intro: "This block is what everyone quotes back at you on the phone. Keep the job number the same across the quote, the work order, and the invoice.",
    fields: [
      { field: "Job / WO number", holds: "One number that follows this motor from intake to invoice. Do not issue a separate quote number and WO number.", required: true },
      { field: "Date received", holds: "The day the motor physically arrived, not the day paperwork was opened. Lead-time promises are measured from here.", required: true },
      { field: "Customer", holds: "Company, site, and the person who can approve money — not just the driver who dropped it off.", required: true },
      { field: "Customer PO number", holds: "Many plants will not pay an invoice without it. Capture it at intake or you will chase it at billing.", required: true },
      { field: "Promised / target date", holds: "The date you told the customer. Keep it visible on the floor copy so it drives sequencing.", required: true },
      { field: "Priority", holds: "Standard, rush, or emergency/breakdown. Drives overtime and outside-service decisions.", required: false },
    ],
  },
  {
    name: "2. Motor nameplate data",
    intro: "Copy this off the plate at intake, before anything is cleaned or the plate goes missing. Half of all rewind disputes trace back to a nameplate nobody recorded.",
    fields: [
      { field: "Manufacturer & model", holds: "Exactly as stamped. Note if the plate is illegible or absent.", required: true },
      { field: "Serial number", holds: "Your proof that the motor you shipped is the motor you received.", required: true },
      { field: "HP / kW", holds: "Rated output. Drives coil data, test values, and price band.", required: true },
      { field: "Volts / amps / phase / Hz", holds: "Full electrical rating. Note dual-voltage and connection type.", required: true },
      { field: "RPM & poles", holds: "Synchronous speed and pole count for winding data.", required: true },
      { field: "Frame size & mounting", holds: "NEMA/IEC frame, foot or flange, shaft dimensions.", required: true },
      { field: "Enclosure", holds: "TEFC, ODP, TENV, explosion-proof. Explosion-proof changes what repairs are legal.", required: true },
      { field: "Insulation class & service factor", holds: "Determines materials and acceptable temperature rise.", required: false },
      { field: "Bearing numbers (DE / ODE)", holds: "Drive-end and opposite-drive-end. Record even if you are not replacing them.", required: true },
      { field: "Accessories", holds: "Encoder, brake, blower, RTDs, thermistors, space heaters — anything that comes back on the motor.", required: false },
    ],
  },
  {
    name: "3. Incoming inspection & test readings",
    intro: "These readings are your evidence. Take them before teardown, record the actual numbers, and note the instrument and ambient conditions.",
    fields: [
      { field: "Reported fault", holds: "What the customer says happened, in their words. Quote it.", required: true },
      { field: "Visual condition", holds: "Contamination, burn marks, impact damage, water, shaft condition, missing parts.", required: true },
      { field: "Insulation resistance (megohm)", holds: "Value, test voltage, duration, and ambient temperature. \"Passed\" is not a reading.", required: true },
      { field: "Winding resistance per phase", holds: "All three phases, so imbalance is visible on the record.", required: true },
      { field: "Surge / hipot result", holds: "If performed. Note the test voltage used.", required: false },
      { field: "Mechanical checks", holds: "Shaft runout, bearing fits, endplay, rotor condition.", required: false },
      { field: "Photos taken", holds: "Reference the photo IDs. Photos at intake end most \"it wasn't like that\" arguments.", required: false },
    ],
  },
  {
    name: "4. Authorized scope & approval",
    intro: "Two separate approvals. Inspection first, repair second, because the repair cannot be priced until the core is open.",
    fields: [
      { field: "Teardown & inspect authorized", holds: "Dollar limit and who approved it, with date. This is the only work permitted before the repair quote.", required: true },
      { field: "Repair scope quoted", holds: "The line items you priced: rewind, bearings, machining, balance, paint, testing.", required: true },
      { field: "Not-to-exceed amount", holds: "The ceiling. Work beyond it needs a fresh approval line, not a phone call nobody wrote down.", required: true },
      { field: "Approved by / date / method", holds: "Name, date, and how — email, PO, verbal. Verbal approvals need a second initial.", required: true },
      { field: "Scrap / return decision", holds: "If the motor is uneconomical, what the customer wants done with the core.", required: false },
    ],
  },
  {
    name: "5. Work performed",
    intro: "Filled in on the floor as the job moves, not reconstructed at the end of the week.",
    fields: [
      { field: "Operation", holds: "Strip, burnout, rewind, VPI/dip-and-bake, machining, bearing fit, balance, assembly, paint.", required: true },
      { field: "Technician", holds: "Who did it. Needed for both quality trace and labor costing.", required: true },
      { field: "Date & hours", holds: "Hours by operation, not one lump at the end. This is where your real job cost lives.", required: true },
      { field: "Coil / winding data", holds: "Turns, wire size, connection, slot count, pitch. Record it — the next rewind of this motor depends on it.", required: false },
      { field: "Outside services", holds: "Vendor, what they did, their cost, and their return date. Outside work is the top cause of blown lead times.", required: false },
    ],
  },
  {
    name: "6. Parts & materials",
    fields: [
      { field: "Part number & description", holds: "Bearings, seals, wire, insulation, varnish, hardware.", required: true },
      { field: "Quantity", holds: "Issued to this job, so stock deducts correctly.", required: true },
      { field: "Unit cost & extended", holds: "Your cost. Selling price belongs on the invoice, not on the floor copy.", required: false },
      { field: "Source", holds: "Shelf stock or purchased for this job, with the PO number if purchased.", required: false },
    ],
  },
  {
    name: "7. Final test & release",
    intro: "The customer is paying for a tested motor. Give them the numbers, not a checkmark.",
    fields: [
      { field: "Final insulation resistance", holds: "Post-repair megohm value with test voltage and temperature.", required: true },
      { field: "No-load run test", holds: "Amps per phase, voltage, run time, vibration, bearing temperatures.", required: true },
      { field: "Balance result", holds: "If the rotor was balanced, the achieved grade or residual value.", required: false },
      { field: "Warranty terms", holds: "Duration and what it covers. Put it on the paperwork, not just in a folder.", required: true },
      { field: "QA sign-off", holds: "Who released the motor for shipment.", required: true },
      { field: "Customer sign-off", holds: "Signature on pickup or delivery note reference.", required: true },
    ],
  },
];

const plainText = `ELECTRIC MOTOR REPAIR — WORK ORDER

Job / WO No: ______________     Date received: ____________
Customer: _________________________________________________
Site / contact: ___________________________________________
Customer PO: ______________     Promised date: ____________
Priority:  [ ] Standard   [ ] Rush   [ ] Emergency

--- MOTOR NAMEPLATE ----------------------------------------
Manufacturer: _____________     Model: ____________________
Serial: ___________________     HP / kW: __________________
Volts: ____________  Amps: ____________  Phase: ____  Hz: ___
RPM: ______  Poles: ______  Frame: ______  Mount: __________
Enclosure: ________  Ins. class: ______  Service factor: ____
Bearing DE: _______________     Bearing ODE: _______________
Accessories: ______________________________________________

--- INCOMING INSPECTION ------------------------------------
Reported fault: ___________________________________________
Visual condition: _________________________________________
Insulation resistance: ________ Mohm @ ______ V, ______ degC
Winding resistance:  U ________  V ________  W ________ ohm
Surge / hipot: ____________________________________________
Mechanical (runout / endplay / fits): _____________________
Photos taken: [ ] Yes   IDs: _____________________________

--- AUTHORIZATION ------------------------------------------
Teardown & inspect authorized to $____________
   Approved by: ______________ Date: ______ Method: ________
Repair scope quoted: ______________________________________
NOT TO EXCEED: $____________
   Approved by: ______________ Date: ______ Method: ________
If uneconomical:  [ ] Scrap   [ ] Return core   [ ] Hold

--- WORK PERFORMED -----------------------------------------
Operation            Technician      Date        Hours
__________________   ____________    ________    ______
__________________   ____________    ________    ______
__________________   ____________    ________    ______
Coil data (turns / wire / connection / pitch): ____________
Outside service:  Vendor __________  Cost $______  Due ____

--- PARTS & MATERIALS --------------------------------------
Part no.        Description        Qty     Cost    Source
____________    _______________    ____    _____   _______
____________    _______________    ____    _____   _______

--- FINAL TEST & RELEASE -----------------------------------
Final insulation resistance: ______ Mohm @ ______ V
No-load run:  U ______ V ______ W ______ A   Time: ________
Vibration: __________   Bearing temp: __________
Balance grade achieved: __________
Warranty: ______ months, covering __________________________
QA released by: ______________________  Date: _____________
Customer sign-off: ___________________  Date: _____________`;

export default function MotorRepairWorkOrderTemplatePage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Motor repair work order template"
        description="A work order built for electric motor and rewind shops — nameplate data, incoming test readings, and a two-stage approval line, because you cannot price a rewind before the core is open. Free to copy, no sign-up."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarTitle="Tired of retyping this?"
        sidebarDescription="See how the same fields work when the work order is generated from the quote instead of typed out per job."
        sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              Most work order templates you find online are generic repair-order forms with a box for
              &ldquo;description of work.&rdquo; They do not survive contact with a motor shop. A rewind job needs
              nameplate data captured before the plate is cleaned off, incoming megohm and winding-resistance readings
              recorded as numbers rather than a checkmark, and an authorization structure that admits you cannot quote
              the repair until you have stripped the core.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The template below is organized the way the job actually moves: intake, nameplate, incoming tests,
              authorization, work performed, parts, final test, release. Use the field tables to understand what
              belongs in each box, then copy the plain-text version and make it yours. If you also need the billing
              side, there is a matching{" "}
              <Link href={SEO_INVOICE_TEMPLATE_PATH} className="text-primary font-medium hover:underline">
                repair shop invoice template
              </Link>
              .
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-bold text-title sm:text-3xl">The template, field by field</h2>
            <div className="mt-6">
              <TemplateFieldSpec groups={groups} plainText={plainText} copyLabel="Copy work order template" />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-12">
              The three fields shops leave blank, and what it costs them
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Serial number.</strong> Skipped constantly, because at intake the motor is
              filthy and the plate is hard to read. It is also the only thing that proves the frame you shipped back is
              the frame that arrived. Shops that record it stop having annual arguments with large plants about
              swapped cores.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Incoming insulation resistance, as a number.</strong> Writing
              &ldquo;failed&rdquo; or &ldquo;low&rdquo; tells you nothing six months later when the customer claims the
              motor was fine when they sent it. A recorded 0.4 Mohm at 500 V and 22&nbsp;&deg;C is evidence. It also
              gives you a before-and-after pair to hand back with the invoice, which is the cheapest trust-builder in
              the business.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Not-to-exceed amount with an approver name.</strong> Verbal
              &ldquo;yeah, go ahead&rdquo; is where margin dies. When a job runs long and the plant refuses the
              overage, the only thing that settles it is a dollar ceiling with a name and a date next to it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Where a paper template stops working
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              A printed template is genuinely the right tool for a two-bench shop. It stops working at the point where
              the same data is being written three times: once on the quote, again on the work order, and a third time
              on the invoice. That is where transcription errors enter, and it is why the parts on the shelf never
              quite match the parts on the job.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The fix is not a better form. It is generating the work order from the approved quote so nameplate data
              and line items carry through, and having the floor update status against the same job number the office
              is looking at. That is what{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software for motor repair shops
              </Link>{" "}
              does, and the wider{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                shop management system
              </Link>{" "}
              covers quoting, inventory, and billing on the same job record. Keep using the template until the
              retyping is the bottleneck — that is the honest signal to switch.
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
