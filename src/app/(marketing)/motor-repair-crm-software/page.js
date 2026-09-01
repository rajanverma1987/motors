import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import SoftwareSeoFaqJsonLd from "@/components/marketing/SoftwareSeoFaqJsonLd";
import SoftwareClusterLinks from "@/components/marketing/SoftwareClusterLinks";
import {
  SEO_SOFTWARE_PILLAR_PATH,
  SEO_SOFTWARE_CRM_PATH,
  SEO_SOFTWARE_WORK_ORDER_PATH,
  SEO_SOFTWARE_INVOICING_PATH,
} from "@/lib/seo-software-paths";

const path = SEO_SOFTWARE_CRM_PATH;

const TITLE = "Motor Repair Shop Management System | IQMotorBase";
const DESCRIPTION =
  "One customer and motor registry with full repair history, plus the leads that fill it. See how IQMotorBase connects leads, customers, and jobs.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "motor repair customer management software",
    "electric motor repair shop management system",
    "motor repair customer database",
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
    q: "How do repair leads work?",
    a: "Leads come from the IQMotorBase directory and local SEO pages. You can choose shared leads (sent to multiple shops) or exclusive leads (sent only to you). Credits are deducted when a lead is delivered.",
  },
  {
    q: "What is stored on a customer and motor record?",
    a: "Each customer has contacts, addresses, billing details, and full job history. Each motor has a serial number, specs, service history, and test results that persist across repeat visits so history is available when you quote new work.",
  },
  {
    q: "What happens when we win a lead?",
    a: "A won lead converts directly into a customer record and a Job Write-Up. You do not retype the inquiry into a separate Shop Management System. From that Job Write-Up you continue into quotes, work orders, and the rest of the shop path on the same job number.",
  },
  {
    q: "Can we import existing customers and motors?",
    a: "Yes. Existing customers, motors, and job history can be uploaded or imported from spreadsheets or other systems at onboarding. Migration support is part of getting a shop live.",
  },
];

export default function MotorRepairCrmSoftwarePage() {
  return (
    <>
      <SoftwareSeoFaqJsonLd items={faqItems} />
      <BlogPageLayout
        title="Motor repair shop shop management system: customers, motors, and the leads that fill them"
        description="One customer and motor registry with full repair history, plus directory and local SEO leads that convert into a customer and Job Write-Up without re-entry. Book a demo."
        breadcrumbLink={{ href: "/", label: "Home" }}
        canonicalPath={path}
        sidebarTitle="Book a demo"
        sidebarDescription="Custom pricing for your shop’s workflow. Tell us who you are and we’ll follow up."
        sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <section>
            <p className="mt-2 text-secondary leading-relaxed">
              Most shop management systems pages for repair shops describe a contact list with notes. That is not the operational
              problem in an electric motor or rewind shop. The problem is that the person who answered the phone, the
              motor that showed up on a pallet, the quote you sent last spring, and the test sheet from the last
              rewind all live in different places, until a returning customer asks for history and the office spends
              twenty minutes hunting folders and email.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              IQMotorBase treats the customer and motor registry as the front door of the same shop system that runs{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                motor repair shop management
              </Link>
              : Job Write-Ups, quotes, work orders, and billing. The differentiator is how that registry gets filled.
              Leads originate from the IQMotorBase public directory and local SEO pages, land in the shop with shared
              or exclusive delivery, and, when you win, convert directly into a customer record and a Job Write-Up. No
              second Shop Management System. No retyping the inquiry so the floor can start intake. This page is about that connection:
              lead generation into the shop system, and a durable customer/motor history once the work repeats.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Customer and motor registry: what is stored, and why it persists
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The customer record is a digital file for the account you bill and call back, not a sticky note on the
              counter. Per customer you keep contacts, addresses, billing details, and full job history. When
              purchasing or accounting asks who approved the last invoice, or when a plant engineer calls and expects
              you to know their ship-to versus bill-to, that information is on the same record as every Job Write-Up
              you have opened for them. You are not reconstructing the account from the last quote PDF you can find.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              The motor record is equally concrete. Per motor you store serial number, specs, service history, and
              test results. That record persists across repeat visits. When a returning customer’s motor comes back
              for another failure, or for a planned rewind on a known unit, the history is available at quote time. The
              estimator is not guessing horsepower, frame, or what was done last time from memory. The floor is not
              starting from a blank clipboard because last year’s paper traveler went with the motor.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Persistence matters because motor repair is rarely a one-and-done consumer ticket. Plants send the same
              assets back. OEMs and maintenance teams ask what failed before. Insurance and warranty conversations
              need a chain of work, not a vague “we fixed something like that.” When test results and service history
              sit on the motor, and job history sits on the customer, you can open a new Job Write-Up without re-entering
              motor details and specs across separate screens. That is the same continuous-record rule that runs the
              rest of IQMotorBase: one job number path from intake through quote and work order, with the registry as
              the durable layer underneath. Tag QR on the floor still encodes the job number for the current repair;
              the registry is what you open before that job exists, when the customer is only on the phone and the
              serial is the only hard fact you have.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Practically, the office uses the registry when the phone rings: identify the customer, see prior jobs,
              pull the motor if the serial is known, and start a Job Write-Up that already knows who owns the asset.
              Practically, the estimator uses it when building preliminary and final quotes on that job, formal RFQs
              start from the Job Write-Up and stay linked to the same number, so the customer conversation and the
              motor history are not split across tools. For how quotes become invoices without re-keying agreed line
              items, see{" "}
              <Link href={SEO_SOFTWARE_INVOICING_PATH} className="text-primary font-medium hover:underline">
                motor repair invoicing and quoting software
              </Link>
              . For how the floor stays on the same job ID after the quote is approved, see{" "}
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="text-primary font-medium hover:underline">
                work order software for motor repair shops
              </Link>
              .
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Shops that still run on spreadsheets often have a “customer sheet” and a separate “motor log” that
              drift apart after the first busy month. Someone updates the phone number in email but not in the sheet.
              Someone writes insulation readings on a bench form that never gets scanned. The IQMotorBase registry is
              meant to stop that drift: contacts and billing on the customer; serial, specs, service history, and test
              results on the motor; full job history tying the two together through Job Write-Ups. If you are coming
              from another system, existing customers, motors, and job history can be uploaded or imported from
              spreadsheets or other systems at onboarding, migration support is part of going live, not an afterthought
              for shops that have years of asset data already.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Leads to customers without re-entry
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              This is the section generic shop management systems and most motor-industry competitors cannot write honestly: the
              product also originates leads for the shop. Leads come from the IQMotorBase public directory and local
              SEO pages, searches like electric motor repair in a city or emergency motor repair near me. The directory
              side of the business is visible on the{" "}
              <Link
                href="/electric-motor-repair-shops-listings"
                className="text-primary font-medium hover:underline"
              >
                electric motor repair shops listings
              </Link>
              . Why listing matters for discovery is covered on{" "}
              <Link href="/why-list-your-motor-repair-shop" className="text-primary font-medium hover:underline">
                why list your motor repair shop
              </Link>
              , and the broader customer-acquisition path is on{" "}
              <Link
                href="/how-motor-repair-shops-get-more-customers"
                className="text-primary font-medium hover:underline"
              >
                how motor repair shops get more customers
              </Link>
              . On this page, the point is what happens after a lead is delivered into the shop system.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              You choose how leads are delivered. Shared leads are sent to multiple shops; you compete on speed and
              service. Exclusive leads are sent to one shop only, used for emergency or high-value jobs where the
              buyer expects a single shop response. That choice is operational, not marketing copy: shared volume
              versus exclusive focus, depending on how your counter staffs the phone and how you price rush work.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Credits work the same way as the homepage FAQ states, without soft-pedaling the economics. The shop
              tops up a lead credit balance. Credits are deducted when a lead is delivered, not when you convert, not
              when the customer pays. Delivery is the billing event. That means you pay for the opportunity to respond,
              which is how a directory-and-SEO lead product has to work if shops are going to get the contact while
              the buyer is still looking. If you win, the payoff is the job, and the registry entry that remains after
              the job.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              When you win a lead, conversion is direct: customer record plus Job Write-Up. You do not export a CSV
              into a different Shop Management System. You do not copy the name, phone, plant, and motor description from a lead email
              into a blank intake form while the truck is already waiting. The Job Write-Up gets its own job number
              and becomes the continuous record for intake, inspection notes, preliminary and final quotes, customer
              send, attachments, and shop actions, the same object the rest of the product uses. From there the path
              is familiar: quotes stay linked to the job number; a work order can be created from the job’s primary
              final quote so motor details, customer, scope, and line items carry through; numbering stays aligned so
              floor and office reference the same ID. If the lead mentioned a motor that later becomes a repeat
              asset, the serial, specs, service history, and test results accumulate on that motor record for the next
              visit, the lead was the first entry, not a disposable inbox message.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That closed loop is the real differentiator versus Spring Point, Aptean, Tekmetric, or any generic
              shop-management tool that expects you to buy leads elsewhere and paste them in. Those systems may store
              customers well enough. They do not originate directory and local SEO leads into the same database that
              opens the Job Write-Up. IQMotorBase does. The Shop Management System page is not a separate product SKU bolted on for
              marketers, it is the registry plus the lead path that fills it, sitting beside the same job board,
              inventory, and AR tools described on the{" "}
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="text-primary font-medium hover:underline">
                shop management software pillar
              </Link>
              .
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              For shops not yet in the directory, the practical next step is to list services so local SEO and
              directory traffic can reach you. Use{" "}
              <Link
                href="/list-your-electric-motor-services"
                className="text-primary font-medium hover:underline"
              >
                list your electric motor services
              </Link>{" "}
              when you are ready to appear. For shops already evaluating software, keep the lead mechanics in mind
              during a demo: ask to see a delivered lead, shared versus exclusive selection, credit deduction on
              delivery, and the one-click path into customer plus Job Write-Up. If that path is not visible, you are
              looking at a contact database with a different label, not the product described here.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
              Why this matters for repeat business
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Repeat business in motor repair is won on memory and trust. The plant that sent you three 100 HP units
              last year expects you to know which one had the insulation issue and which one was a mechanical repair.
              If that knowledge lives only in a senior winder’s head, the shop is one vacation away from sounding like
              a new vendor. Full history in one place, customer contacts and billing, motor serial and specs, service
              history, test results, and the Job Write-Ups that connect them, lets the next person at the counter quote
              and schedule without starting from zero.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Reporting reinforces the same point. IQMotorBase surfaces revenue, completed jobs, technician workload,
              and top customers without exporting to a spreadsheet just to see who actually drives the month. Spotting
              repeat-customer patterns is easier when “top customers” and job history sit on the same system that took
              the original lead. You can see which accounts return, which motors bounce back, and where capacity is
              going, bottlenecks and planning, not vanity dashboards.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Leads that convert into the registry also change the economics of acquisition. A won exclusive or shared
              lead is not a one-off phone call that dies in someone’s inbox. It becomes a customer and motor record
              that can earn a second and third Job Write-Up. The credit was spent at delivery; the asset value of the
              relationship is the history you keep afterward. That is why this Shop Management System page leans so hard on the lead
              path: acquisition without re-entry, then retention through a registry that actually remembers the motor.
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
              Pricing is custom, monthly, yearly, or one-time, matched to how your shop runs. There is no public
              self-serve rate card. Use the form on this page to book a demo and see the customer/motor registry and
              lead-to-Job-Write-Up path on your terms. If you are not yet listed in the directory and want inbound
              repair inquiries to reach your shop, start with{" "}
              <Link
                href="/list-your-electric-motor-services"
                className="text-primary font-medium hover:underline"
              >
                list your electric motor services
              </Link>
              .
            </p>
            <div className="mt-6">
              <SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />
            </div>
          </section>

          <SoftwareClusterLinks
            excludeHref={SEO_SOFTWARE_CRM_PATH}
            extraLinks={[
              { href: "/electric-motor-repair-shops-listings", label: "Electric motor repair shops listings" },
              { href: "/why-list-your-motor-repair-shop", label: "Why list your motor repair shop" },
              {
                href: "/how-motor-repair-shops-get-more-customers",
                label: "How motor repair shops get more customers",
              },
              { href: "/list-your-electric-motor-services", label: "List your electric motor services" },
            ]}
          />
        </article>
      </BlogPageLayout>
    </>
  );
}
