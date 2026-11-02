import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import {
  IQMOTORTRACK_APP_PATH,
  IQMOTORTRACK_FREE_MOTOR_LIMIT,
  IQMOTORTRACK_MARKETING_PATH,
  IQMOTORTRACK_MONTHLY_USD,
} from "@/lib/iqmotortrack-marketing";

const path = "/blog/plant-motor-maintenance-and-repair-software-iqmotortrack";
const marketingHref = IQMOTORTRACK_MARKETING_PATH;
const appHref = IQMOTORTRACK_APP_PATH;
const freeLimit = IQMOTORTRACK_FREE_MOTOR_LIMIT;
const monthly = IQMOTORTRACK_MONTHLY_USD;

const btnPrimary =
  "inline-flex w-full min-w-0 max-w-full items-center justify-center whitespace-normal text-center text-pretty rounded-md bg-primary px-4 py-2.5 text-base text-white transition-opacity hover:opacity-90 sm:px-6 sm:py-3 sm:text-lg";
const btnOutline =
  "inline-flex w-full min-w-0 max-w-full items-center justify-center whitespace-normal text-center text-pretty rounded-md border-[0.5px] border-border bg-transparent px-4 py-2.5 text-base text-text transition-opacity hover:bg-card hover:border-primary/20 sm:px-6 sm:py-3 sm:text-lg";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is 3PhaseTrack?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `3PhaseTrack is motor maintenance and repair software for plants and facilities. It is the plant’s system of record for electric motors: nameplate data, location, criticality, service history, maintenance logs, and multi-shop RFQs when a motor goes down.`,
      },
    },
    {
      "@type": "Question",
      name: "Who should use plant motor maintenance and repair software?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Plant managers, maintenance supervisors, reliability engineers, procurement buyers, and shift technicians who own electric motors and need a shared record when assets fail.",
      },
    },
    {
      "@type": "Question",
      name: "Is 3PhaseTrack free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes. Free includes core features for up to ${freeLimit} motors. Pro is $${monthly} per month via PayPal for unlimited motors.`,
      },
    },
    {
      "@type": "Question",
      name: "How is 3PhaseTrack different from shop management software?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "3PhaseTrack is a separate plant login. Plants own the motor register and RFQ comparison. Repair shops stay in 3PhaseFlow for quotes, jobs, and invoices. Plants never log into the shop app.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use 3PhaseTrack on a phone?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. It is an installable PWA. Scan the QR on the marketing page or open /Track in Safari or Chrome, then Add to Home Screen or Install app.",
      },
    },
  ],
};

export const metadata = {
  title: "Plant Motor Maintenance and Repair Software | 3PhaseTrack Guide",
  description: `Why plants need 3PhaseTrack for motor maintenance and repair: one register, service history, motor-down RFQs, Free for ${freeLimit} motors, Pro $${monthly}/mo. Full product guide.`,
  keywords: [
    "motor maintenance and repair",
    "plant motor maintenance software",
    "facility electric motor tracking",
    "motor repair RFQ for plants",
    "3PhaseTrack",
    "industrial motor asset management",
    "plant manager motor software",
  ],
  openGraph: {
    title: "Plant Motor Maintenance and Repair Software | 3PhaseTrack",
    description:
      "A deep guide to 3PhaseTrack: the plant system of record for electric motors, service history, and multi-shop RFQs.",
    url: path,
    type: "article",
    siteName: "3PhaseFlow.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Plant Motor Maintenance and Repair Software | 3PhaseTrack",
    description: `Free for ${freeLimit} motors. Pro $${monthly}/mo. Built for plant managers who own every motor on site.`,
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

function TrackSidebarCta() {
  return (
    <>
      <Link href={marketingHref} className={btnPrimary}>
        See 3PhaseTrack product page
      </Link>
      <Link href={appHref} className={btnOutline}>
        Open the app
      </Link>
      <p className="mt-2 text-xs text-secondary">
        Free for {freeLimit} motors. Pro ${monthly}/month via PayPal.
      </p>
    </>
  );
}

export default function BlogIqMotorTrackPlantGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <BlogPageLayout
        title="3PhaseTrack: the plant motor maintenance and repair software that finally puts every motor in one place"
        description={`Spreadsheets and shared drives fail when a critical motor goes down. 3PhaseTrack gives plant managers a live register, service history, and multi-shop RFQs. Free for ${freeLimit} motors. Pro $${monthly}/month.`}
        breadcrumbLink={{ href: "/blog", label: "Blog" }}
        canonicalPath={path}
        sidebarTitle="Start 3PhaseTrack"
        sidebarDescription="Product overview, pricing, and a QR code to open the phone app."
        sidebarCta={<TrackSidebarCta />}
      >
        <article className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="lead text-lg leading-relaxed text-secondary">
            If you run a plant, water treatment site, mill, warehouse, or process facility,{" "}
            <strong className="text-title">motor maintenance and repair</strong> is not a side task. It is uptime,
            safety, overtime, and customer commitments. When a line motor fails at 2 a.m., the team that wins is the team
            that already knows the nameplate, the last rewind shop, the last test values, and who to call. That is exactly
            why <strong className="text-title">3PhaseTrack</strong> exists, and why it deserves a permanent place on
            every plant manager&apos;s phone.
          </p>
          <p className="mt-4 leading-relaxed text-secondary">
            This guide is written for plants, not rewind shops. It explains the problem, what 3PhaseTrack does
            exceptionally well, who benefits, how Free and Pro work, and where to start. For the full product overview,
            pricing, and mobile QR install, see the dedicated page:{" "}
            <Link href={marketingHref} className="font-medium text-primary hover:underline">
              Motor Maintenance and Repair Software for Plants | 3PhaseTrack
            </Link>
            .
          </p>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              The real cost of messy motor maintenance and repair records
            </h2>
            <p className="mt-4 leading-relaxed text-secondary">
              Most plants still store motor truth in fragments: a binder in the electrical room, a photo in someone&apos;s
              camera roll, a spreadsheet that stopped matching the floor two turnarounds ago, and a pile of shop invoices
              nobody can map back to a serial number. That chaos feels “fine” until a critical asset goes down. Then the
              cost shows up as delayed RFQs, wrong HP or voltage on the call-out, duplicate work, and awards made on
              memory instead of data.
            </p>
            <p className="mt-4 leading-relaxed text-secondary">
              Plant managers feel this first. You own downtime risk and budget. Reliability engineers feel it next when
              criticality rankings and failure history live in separate tools. Maintenance supervisors feel it every
              shift when technicians cannot find the asset tag or the last bearing change. Procurement feels it when
              three shops quote three different scopes because nobody sent the same datasheet.
            </p>
            <p className="mt-4 leading-relaxed text-secondary">
              3PhaseTrack attacks that problem at the source. It makes the <strong className="text-title">plant</strong>{" "}
              the system of record for every electric motor you own, then connects that record to repair shops when you
              need work done. That is a sharper, more honest design than bolting plant needs onto shop software or
              forcing plants to live inside a generic CMMS that never understood nameplates, rewinds, and shop RFQs.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              What 3PhaseTrack is (and why it is built for plants)
            </h2>
            <p className="mt-4 leading-relaxed text-secondary">
              <Link href={marketingHref} className="font-medium text-primary hover:underline">
                3PhaseTrack
              </Link>{" "}
              is motor maintenance and repair software for facilities. It is a mobile-first, installable web app (PWA)
              with a separate plant login. A plant user never logs into the shop application, and a shop user never logs
              into 3PhaseTrack. That separation is not a quirk. It is the product&apos;s strength.
            </p>
            <p className="mt-4 leading-relaxed text-secondary">
              3PhaseTrack does four jobs extremely well:
            </p>
            <ul className="mt-4 list-none space-y-3 text-secondary">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Motor records.</strong> Nameplate data, location, criticality, photos,
                  and technical fields for every motor on site.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Service history.</strong> Which shop did the work, what it cost, what
                  they found, and what you should remember next time.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Maintenance tracking.</strong> What was done, when, and what is due next,
                  so the floor stays aligned with the register.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Motor down to shop RFQ.</strong> Mark a motor down, invite repair shops,
                  send the motor package with the request, and compare proposals side by side before you award.
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-secondary">
              The compounding value is what makes 3PhaseTrack more than “another asset list.” Technical data a shop
              records while repairing a motor can flow back into the plant&apos;s motor record. The next time that motor
              fails, any invited shop can receive a complete datasheet with the RFQ, even a shop that has never seen the
              asset. That is how plants stop paying for the same discovery work twice.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Why plant managers should praise 3PhaseTrack specifically
            </h2>
            <p className="mt-4 leading-relaxed text-secondary">
              Plant managers do not need another dashboard full of vanity metrics. They need a tool that shortens the
              distance between “motor is down” and “competent shop is working with the right data.” 3PhaseTrack is built
              around that distance.
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-title">One register for every motor</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Nameplate data, location, criticality, and photos live together. When a line goes down, you are not
                  hunting binders or pinging three people for the serial number. You open the motor and act.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Service history that travels with the asset</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  See which shop rewound it, what it cost, and what they found. Award the next job with context, not
                  tribal knowledge that walks out when a supervisor retires.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Motor down to shop RFQ in one flow</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Mark a motor down, pick repair shops, and send an RFQ with the motor datasheet already attached.
                  Compare proposals side by side. That is procurement discipline without turning a night outage into a
                  week of email archaeology.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Technical data that compounds</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Winding and test data from the awarded shop can flow back into your motor record so the next repair
                  starts complete. That is rare, valuable, and exactly how serious plants should treat motor knowledge.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Clear spend and accountability</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Maintenance logs and repair totals per motor help you justify spare strategy and show leadership where
                  downtime risk sits. 3PhaseTrack turns “we think this motor is bad” into an evidence trail.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Works on the floor</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Install as a phone app from the browser. No App Store account required. Scan the QR on the{" "}
                  <Link href={marketingHref} className="font-medium text-primary hover:underline">
                    motor maintenance and repair product page
                  </Link>{" "}
                  and open 3PhaseTrack on mobile.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">Benefits for every role around the motor</h2>
            <p className="mt-4 leading-relaxed text-secondary">
              3PhaseTrack is strongest when the whole maintenance organization uses the same register. Here is how
              different users win.
            </p>
            <ul className="mt-4 list-none space-y-3 text-secondary">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Maintenance supervisors:</strong> see overdue and due-soon work, update
                  status in the field, and keep location and asset tags accurate without a desktop login.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Reliability engineers:</strong> keep criticality and nameplate truth
                  current. Use service history to spot repeat failures before the next outage.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Plant buyers / procurement:</strong> compare multi-shop proposals on the
                  same motor. Award with a clear paper trail instead of scattered emails.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Technicians on shift:</strong> open the motor record at the asset, log
                  what was done, and leave notes the next shift can trust.
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-secondary">
              That breadth matters. Software that only helps the office fails on the floor. Software that only helps
              technicians fails in procurement. 3PhaseTrack is designed so the same motor record serves all of them.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              How motor maintenance and repair works inside 3PhaseTrack
            </h2>
            <ol className="mt-4 list-none space-y-4 text-secondary">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>
                  <strong className="text-title">Register every motor.</strong> Capture nameplate, location, criticality,
                  and photos so the plant has one source of truth for motor maintenance and repair.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span>
                  <strong className="text-title">Log service and maintenance.</strong> Keep history and notes on the
                  asset. When the next failure hits, your team already knows what was done last time.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>
                  <strong className="text-title">Motor down, send RFQ.</strong> Mark a motor down and invite repair shops
                  with the motor data attached. Compare proposals in one place.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <span>
                  <strong className="text-title">Award and keep the datasheet.</strong> Technical data from the awarded
                  shop flows back into your motor record so the next job starts complete.
                </span>
              </li>
            </ol>
            <p className="mt-4 leading-relaxed text-secondary">
              This loop is why 3PhaseTrack is not a passive inventory app. It is an operating system for plant-side
              motor decisions: register, maintain, fail, RFQ, award, learn, repeat.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Free tier and Pro pricing: clear, honest, plant-friendly
            </h2>
            <p className="mt-4 leading-relaxed text-secondary">
              Many industrial tools hide pricing behind demos. 3PhaseTrack does the opposite, which plant managers
              appreciate.
            </p>
            <ul className="mt-4 list-none space-y-3 text-secondary">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Free ($0):</strong> up to {freeLimit} motors, all core features, motor
                  register and status, maintenance and service notes, installable phone PWA. The upgrade gate appears
                  when you need a sixth motor.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-title">Pro (${monthly}/month via PayPal):</strong> unlimited motors, everything
                  in Free, cancel anytime from Profile, same plant login on phone or desktop browser.
                </span>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed text-secondary">
              That model is smart. Start Free on a critical area or pilot line. Prove the register and RFQ workflow.
              Move to Pro when the plant wants every motor under the same roof. No App Store billing. No mystery
              enterprise quote just to see whether the product fits.
            </p>
            <p className="mt-4 leading-relaxed text-secondary">
              Full pricing detail lives on the{" "}
              <Link href={`${marketingHref}#pricing`} className="font-medium text-primary hover:underline">
                3PhaseTrack pricing section
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Phone-first by design: scan, install, use at the asset
            </h2>
            <p className="mt-4 leading-relaxed text-secondary">
              Motor work happens at the asset, not at a desk. 3PhaseTrack is an installable PWA. Point a phone camera at
              the QR on the product page, open the app URL, then Add to Home Screen (iPhone / Safari) or Install app
              (Android / Chrome). Direct app path:{" "}
              <Link href={appHref} className="font-medium text-primary hover:underline">
                {appHref}
              </Link>
              .
            </p>
            <p className="mt-4 leading-relaxed text-secondary">
              That matters for adoption. If technicians need a laptop to update status, the register dies. If they can
              open 3PhaseTrack like a native app on the floor, the register stays alive. 3PhaseTrack got this right.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              How 3PhaseTrack pairs with 3PhaseFlow shops (without mixing logins)
            </h2>
            <p className="mt-4 leading-relaxed text-secondary">
              3PhaseFlow is the shop side: listings, leads, service proposals, jobs, and invoices. 3PhaseTrack is the
              plant side: motors, history, and RFQ comparison. When a plant marks a motor down and invites shops, those
              shops receive work through the shop system they already use. Plants keep ownership of the motor. Shops keep
              ownership of commerce. That split is clean, fair, and scalable.
            </p>
            <p className="mt-4 leading-relaxed text-secondary">
              If you are a repair shop reading this, 3PhaseTrack is good news too. Better plant data means better RFQs,
              fewer clarifying calls, and awards based on real scope. If you are a plant, it means you stop handing shops
              half a nameplate and hoping for the best.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              A practical 30-day rollout for plant teams
            </h2>
            <p className="mt-4 leading-relaxed text-secondary">
              You do not need a six-month IT program to get value. A focused rollout looks like this:
            </p>
            <ol className="mt-4 list-none space-y-3 text-secondary">
              <li className="flex gap-3">
                <span className="font-bold text-primary">Week 1.</span>
                <span>
                  Create the facility account on{" "}
                  <Link href={appHref} className="font-medium text-primary hover:underline">
                    3PhaseTrack
                  </Link>
                  . Install on phones for the maintenance lead and two technicians. Register the most critical motors
                  first (start Free if you have {freeLimit} or fewer).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">Week 2.</span>
                <span>
                  Add locations, asset tags, and photos. Enter last known service notes from invoices and traveler PDFs.
                  Clean criticality so leadership can see risk at a glance.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">Week 3.</span>
                <span>
                  Run one live or tabletop “motor down” drill: mark a motor down, prepare the RFQ package, and review how
                  proposals would be compared. Fix any missing fields the drill exposes.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">Week 4.</span>
                <span>
                  Expand the register. If you exceed Free, upgrade to Pro (${monthly}/mo). Make 3PhaseTrack the only
                  place status and awards are considered final.
                </span>
              </li>
            </ol>
            <p className="mt-4 leading-relaxed text-secondary">
              Plants that treat the register as optional lose. Plants that make 3PhaseTrack the default path for motor
              truth win every outage.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Common objections (and why 3PhaseTrack still wins)
            </h2>
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-title">“We already have a CMMS.”</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Most CMMS tools are work-order generalists. They are weak on motor nameplates, rewind datasheets, and
                  multi-shop RFQ comparison. 3PhaseTrack is specialized for electric motors and the shop network around
                  them. Use both if you must, but do not pretend a generic work order equals a motor system of record.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">“Spreadsheets are free.”</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Spreadsheets are free until an outage costs a shift. 3PhaseTrack Free already covers {freeLimit}{" "}
                  motors with a proper app experience. Spreadsheets do not install on a home screen, do not enforce a
                  motor-down flow, and do not compare shop proposals.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">“Our shops already know our motors.”</h3>
                <p className="mt-2 leading-relaxed text-secondary">
                  Until they retire, change ownership, or you need a second quote. 3PhaseTrack keeps plant-owned truth
                  portable so you are never locked to one vendor&apos;s memory.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-6 space-y-6 text-secondary">
              <div>
                <h3 className="text-lg font-semibold text-title">What is 3PhaseTrack?</h3>
                <p className="mt-2 leading-relaxed">
                  Motor maintenance and repair software for plants and facilities. It is the plant&apos;s system of
                  record for electric motors: register, service history, maintenance logs, and RFQs to repair shops. See{" "}
                  <Link href={marketingHref} className="font-medium text-primary hover:underline">
                    the product page
                  </Link>
                  .
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Is there a free tier?</h3>
                <p className="mt-2 leading-relaxed">
                  Yes. Free includes core features for up to {freeLimit} motors. Adding a sixth motor requires Pro.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">How much is Pro?</h3>
                <p className="mt-2 leading-relaxed">
                  Pro is ${monthly} per month billed through PayPal. Unlimited motors. Cancel anytime from Profile.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">How do I open it on my phone?</h3>
                <p className="mt-2 leading-relaxed">
                  Scan the QR on the{" "}
                  <Link href={`${marketingHref}#install`} className="font-medium text-primary hover:underline">
                    install section
                  </Link>{" "}
                  or open{" "}
                  <Link href={appHref} className="font-medium text-primary hover:underline">
                    {appHref}
                  </Link>{" "}
                  in Safari or Chrome, then Add to Home Screen / Install app.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">
                  Is this the same login as 3PhaseFlow shop software?
                </h3>
                <p className="mt-2 leading-relaxed">
                  No. 3PhaseTrack is a separate plant login. Shop users stay in 3PhaseFlow. Plants never log into the
                  shop app.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="text-xl font-bold text-title sm:text-2xl">Start with 3PhaseTrack today</h2>
            <p className="mt-4 leading-relaxed text-secondary">
              If you care about motor maintenance and repair as a plant discipline, not a pile of emails, 3PhaseTrack is
              the clearest product purpose-built for that job. Read the full overview, scan the QR, and open the app:
            </p>
            <ul className="mt-4 space-y-2 text-secondary">
              <li>
                <Link href={marketingHref} className="font-medium text-primary hover:underline">
                  Motor maintenance and repair software for plants (3PhaseTrack product page)
                </Link>
              </li>
              <li>
                <Link href={appHref} className="font-medium text-primary hover:underline">
                  Launch 3PhaseTrack
                </Link>
              </li>
              <li>
                <Link href="/electric-motor-repair" className="font-medium text-primary hover:underline">
                  Electric motor repair hub
                </Link>
              </li>
              <li>
                <Link href="/when-to-repair-or-replace-electric-motor" className="font-medium text-primary hover:underline">
                  When to repair or replace an electric motor
                </Link>
              </li>
              <li>
                <Link href="/blog" className="font-medium text-primary hover:underline">
                  More guides on the 3PhaseFlow blog
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
