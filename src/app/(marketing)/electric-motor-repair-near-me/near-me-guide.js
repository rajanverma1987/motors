import Link from "next/link";
import NearMeFaqAccordion from "./near-me-faq-accordion";
import { NEAR_ME_FAQS } from "./near-me-seo-data";

const LISTINGS = "/electric-motor-repair-shops-listings";

function GuideCta({ href, children }) {
  return (
    <p className="mt-6">
      <Link href={href} className="text-base font-semibold text-primary hover:underline">
        {children}
      </Link>
    </p>
  );
}

export default function NearMeGuide() {
  return (
    <article className="mx-auto max-w-[67.2rem] px-4 py-12 sm:px-6 sm:py-16">
      <section>
        <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
          What to have ready before you call
        </h2>
        <p className="mt-4 text-secondary leading-relaxed">
          Shops need specific nameplate and failure data to quote accurately; having it ready typically cuts quote
          turnaround from about 24 hours to under an hour.
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          The same packet is what you should use when you search nearby shops. Filter listings by voltage class and
          motor type first, then call the two or three shops whose service radius actually covers your plant, a shop
          40 miles away that lists pickup in your county is often faster than a closer shop that only accepts drop-off
          during business hours. If you only have a city and HP, you will get a “call us” quote; if you have FLA, frame,
          enclosure, and photos, many shops will give a written range the same day.
        </p>
        <dl className="mt-8 space-y-8">
          <div>
            <dt className="text-lg font-semibold text-title">1. Nameplate data</dt>
            <dd className="mt-2 text-secondary leading-relaxed">
              Record manufacturer, model, horsepower, voltage, full-load amps (FLA), RPM, frame size, NEMA design
              letter, service factor, enclosure type (ODP, TEFC, or explosion-proof), and insulation class. Shops use
              HP and voltage to scope rewind copper and insulation; frame size confirms whether a replacement will bolt
              in if repair is ruled out; insulation class tells them whether a straight rewind is enough or the winding
              should be upgraded (for example Class F versus Class H). If the nameplate is missing or painted over, they
              must test-determine specs before quoting, add 1 to 2 days, and expect a higher inspection fee because they
              are reverse-engineering the machine instead of matching a catalog winding.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-title">2. Failure symptoms</dt>
            <dd className="mt-2 text-secondary leading-relaxed">
              Describe what the motor did before it stopped: tripped overload relay, high current, grinding, humming,
              knocking, heat, vibration, or a no-start. Symptom patterns narrow diagnosis. Repeated overload trips
              often point to thermal insulation damage; grinding on startup is usually bearings; a hum with no rotation
              often means a failed capacitor on single-phase or a lost phase on three-phase.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-title">3. Operating context</dt>
            <dd className="mt-2 text-secondary leading-relaxed">
              Note the driven load (pump, compressor, conveyor, fan), hours per day, and environment (outdoor, dusty,
              wet, chemical, high ambient). That tells the shop whether the failure is application-related. A 20 HP
              motor on a pump that actually needs 30 HP will fail again in 12 to 18 months if you rewind it without
              correcting the undersizing.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-title">4. Failure history</dt>
            <dd className="mt-2 text-secondary leading-relaxed">
              How many times has this motor been repaired or rewound? A first failure on a 5-year-old motor is a
              different decision than a third repair on a 20-year-old unit. Shops use that history to recommend repair
              versus replace and to spot chronic application problems that a rewind will not fix.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-title">5. Urgency</dt>
            <dd className="mt-2 text-secondary leading-relaxed">
              Say whether this is production-critical downtime (often $1,000+ per hour) or a non-critical spare. Shops
              triage jobs differently. If you need emergency turnaround, say so on the first call, emergency fees
              typically run 25 to 50% above standard rates but can compress a 7-day repair into 24 to 48 hours.
            </dd>
          </div>
          <div>
            <dt className="text-lg font-semibold text-title">6. Photos</dt>
            <dd className="mt-2 text-secondary leading-relaxed">
              Send a photo of the nameplate and any visible damage (burn marks, broken windings, water ingress, impact).
              Many shops can pre-diagnose from photos and give a ballpark before the motor arrives, which can save a
              trip if the unit is already a replace candidate.
            </dd>
          </div>
        </dl>
        <GuideCta href={LISTINGS}>Submit a repair request, get matched with local shops →</GuideCta>
        <p className="mt-3">
          <Link href={LISTINGS} className="font-medium text-primary hover:underline">
            Browse repair shops in your state
          </Link>
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
          Matching your motor type to the right repair shop
        </h2>
        <p className="mt-4 text-secondary leading-relaxed">
          Not all motor repair shops handle all motor types. A shop that is “near you” on a map is useless if they
          subcontract your voltage class or send servo work out of state. Here is what to look for by motor type, and
          what questions to ask before shipping. For plant-scale frames, medium-voltage, and process-critical equipment,
          also see{" "}
          <Link href="/industrial-motor-repair" className="font-medium text-primary hover:underline">
            industrial motor repair
          </Link>
          .
        </p>
        <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2">
          <li className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-title">AC induction motors (three-phase and single-phase)</h3>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              This is the most widely repaired type, most established shops within a typical 50 to 100 mile service
              radius handle it. For three-phase motors above 100 HP, confirm rewind capability at your voltage and that
              they have done your frame size before; a shop that mainly rewinds 5 to 25 HP HVAC motors will not have VPI
              tanks or burnout ovens sized for a 326T or 404T frame. For single-phase, ask whether they handle your
              specific winding (capacitor-start, capacitor-run, or split-phase). EASA-accredited shops are the safest
              choice for any AC rewind because accreditation requires core-loss testing before and after burnout, which
              protects nameplate efficiency. If two nearby shops both rewind AC, pick the one that will put those
              before/after core-loss numbers on the job traveler.
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-title">DC motors</h3>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              DC work needs armature rewinding, commutator resurfacing, and brush-gear inspection, capabilities not
              every shop keeps after the industry shifted to AC drives. Ask whether they have an armature lathe and a
              growler (armature tester) on site. Shops without those tools subcontract armature work, which adds days
              and a markup, and you lose a single point of accountability if the commutator fails in 90 days. DC repair
              is still common on older crane, hoist, and rolling-mill drives; shops that serve those industries usually
              keep active DC capability. If the nearest listing is 150 miles away but has an armature lathe, that is
              usually faster than a closer shop that will freight the armature to a third party.
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-title">Servo motors</h3>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Servo repair requires encoder replacement, feedback calibration, and often proprietary diagnostic
              software. Most general shops do not do this; sending a servo to a shop without the right benches can
              return a motor that spins but will not hold closed-loop accuracy on a CNC axis or packaging line. Ask
              whether they can test encoder output (lines per revolution, commutation signals) and verify
              velocity/position loop performance before return. Specialized servo rebuild shops, not a general rewind
              bench, are the right category. A “near me” listing that only mentions AC/DC rewinding is not a servo
              shop; keep searching by capability, not by pin drop.
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-title">High-voltage motors (above 4 kV)</h3>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              High-voltage repair needs hi-pot equipment rated for the motor’s class, specialized coil forming, and
              form-wound coil experience, random-wound methods used on low-voltage motors do not apply above 4 kV.
              Confirm they have rewound at your voltage (4160 V, 6600 V, 13.2 kV) and ask for industry references. These
              rewinds often run $15,000 to $100,000+ on large frames and cannot be undone if the coils are built wrong.
              Expect fewer shops in any metro; it is normal to ship a 4160 V motor across a state line to the shop that
              actually owns a form-wound coil bench and a hi-pot set rated above your test voltage.
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
            <h3 className="text-lg font-semibold text-title">Specialty and wound equipment (transformers, coils)</h3>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Transformer repair and specialty coil winding are separate disciplines from motor repair, even when the
              same company lists both. If you have a transformer or custom coil, verify they have a winding machine and
              dip-and-bake capability for your voltage class, and that they have done similar work, not just that it
              appears on a services list.
            </p>
          </li>
        </ul>
        <p className="mt-6 text-secondary leading-relaxed">
          For a full breakdown of service types and what each repair involves, see{" "}
          <Link href="/types-of-electric-motor-repair-services" className="font-medium text-primary hover:underline">
            Types of electric motor repair services
          </Link>
          .
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
          How to evaluate a motor repair shop before you ship your motor
        </h2>
        <p className="mt-4 text-secondary leading-relaxed">
          Choosing the wrong shop costs more than the invoice, a poor rewind can fail within months, and a shop
          without the right equipment will subcontract work and split accountability. Use the directory to shortlist
          shops that already list your motor type and emergency hours, then spend the phone call on these five
          questions. Write the answers down; if two shops quote similar dollars, the testing report, in-house rewind,
          and warranty terms are how you break the tie.
        </p>
        <ol className="mt-8 list-none space-y-8 p-0">
          <li>
            <h3 className="text-lg font-semibold text-title">1. Ask for their EASA accreditation status</h3>
            <p className="mt-2 text-secondary leading-relaxed">
              EASA (Electrical Apparatus Service Association) accreditation is the clearest independent signal of
              repair practice. Accredited shops must follow EASA AR100, including core-loss testing before and after
              stator burnout, the step that protects efficiency during rewind. Non-accredited shops may still do
              careful work, but there is no third-party check. Verify the shop’s current accreditation on the EASA
              member directory (search easa.com, do not take a logo on a homepage as proof). If they say they “follow
              AR100” but are not accredited, ask which core-loss tester they use and whether they will attach before/after
              watts-loss numbers to your traveler.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">2. Ask what testing they perform after repair</h3>
            <p className="mt-2 text-secondary leading-relaxed">
              Every shop should perform at minimum insulation resistance (megohm) testing, winding resistance
              measurement, and a no-load run before returning the motor. Stronger shops also run hi-pot, vibration
              analysis, and thermal imaging under load. Ask for a written test report with the motor, megohm values,
              winding ohms per phase, no-load amps, and vibration in in/s if they balance. If they will not provide a
              report, you have no documented baseline the next time the same motor fails, and you cannot compare two
              nearby shops on anything except price.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">3. Ask whether they rewind in-house or subcontract</h3>
            <p className="mt-2 text-secondary leading-relaxed">
              Some shops send rewind work to another facility. That is not automatically a problem, but it adds time,
              cost, and split accountability, if the rewind fails, the shop you hired may point at the subcontractor.
              Ask directly: “Is all rewind work performed in your facility?” If they subcontract, ask who, and whether
              you can contact that facility.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">4. Ask for references in your industry</h3>
            <p className="mt-2 text-secondary leading-relaxed">
              A shop that repairs pumps at a water plant may not have documentation habits for explosion-proof motors
              in a chemical facility. Ask for two or three references in your sector and call them. Shops that work
              regularly in your industry already know the traveler sheets, material certs, and weld logs regulated
              plants require.
            </p>
          </li>
          <li>
            <h3 className="text-lg font-semibold text-title">5. Ask about their warranty</h3>
            <p className="mt-2 text-secondary leading-relaxed">
              Standard coverage is 12 months on parts and labor; some shops offer 18 to 24 months. Ask what it covers
              (rewind only versus mechanical parts), what voids it (misapplication, overload), and how a claim is
              processed. A shop confident in its work will not haggle on those terms.
            </p>
          </li>
        </ol>
        <GuideCta href={LISTINGS}>
          Browse EASA-accredited and certified shops in the IQMotorBase directory →
        </GuideCta>
        <p className="mt-3">
          <Link href={LISTINGS} className="font-medium text-primary hover:underline">
            Browse repair shops in your state
          </Link>
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          For a complete shop selection checklist, see{" "}
          <Link href="/how-to-choose-electric-motor-repair-shop" className="font-medium text-primary hover:underline">
            How to choose an electric motor repair shop
          </Link>
          .
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
          Repair or replace? The decision most shops won&apos;t make for you
        </h2>
        <p className="mt-4 text-secondary leading-relaxed">
          The widely cited rule is: if repair cost exceeds 50% of a new equivalent motor, lean toward replacement.
          That is a starting point, not a hard stop. A motor on a critical process may be worth repairing at 70% of
          replacement cost if a new unit is 8 weeks out. A motor running 24/7 may be worth replacing at 40% if the
          failure points to a design-life issue rather than a one-time fault. Local stock changes this: if a NEMA
          Premium equivalent is on a distributor shelf 20 miles away, replacement wins more often than if the same
          frame is 14 weeks from the OEM.
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          Efficiency changes the math. Motors built before 2007 predate EISA efficiency mandates and may run at
          88 to 91%. Current NEMA Premium motors typically run at 93 to 96%. For a 50 HP motor at 6,000 hours per year and
          $0.12/kWh, that 4 to 5% gap is roughly $1,200 to $1,500 per year. If the motor misses NEMA Premium and runs more
          than 4,000 hours per year, energy savings can pay for replacement in 2 to 3 years, factor that in before you
          authorize another rewind.
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          Failure history is the third dimension. A first failure on a well-matched, well-maintained motor in good
          physical condition is almost always worth repairing. A second or third rewind, or the same failure repeating,
          is telling you about application fit or operating conditions that a rewind will not fix. Ask the shop:
          “Based on what you have seen, is there a reason to expect this motor to fail the same way again?” A shop
          that inspects motors all day will usually answer that honestly.
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          Parts availability can override cost. Above 250 HP, on obsolete frames, or on OEM-discontinued designs,
          replacement can take 12 to 20 weeks. Then repair is often the only practical option regardless of the 50% rule.
          Confirm whether the shop has parts in stock and at what lead time, if a critical piece is coming from
          overseas, build that risk into your outage plan before you commit.
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          Full repair vs. replace framework with cost calculators:{" "}
          <Link href="/when-to-repair-or-replace-electric-motor" className="font-medium text-primary hover:underline">
            When to repair or replace an electric motor
          </Link>
          .
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
          What motor repair costs near you, and when to question a quote
        </h2>
        <p className="mt-4 text-secondary leading-relaxed">
          Cost varies by motor size, repair scope, and urgency. Metro shops with overnight freight lanes often quote
          toward the high end of a range; rural shops with pickup trucks may look cheaper until you add a 90-mile
          round trip and a second day of downtime. The ranges below are typical for CONUS shops at standard
          (non-emergency) turnaround, use them to calibrate a quote, not as a bid.
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-semibold text-title">Bearing replacement, fractional to 25 HP</dt>
            <dd className="mt-1 text-secondary">$150 to $600</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-semibold text-title">Bearing replacement, 25 to 100 HP</dt>
            <dd className="mt-1 text-secondary">$400 to $1,200</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-semibold text-title">Full rewind, 1 to 10 HP</dt>
            <dd className="mt-1 text-secondary">$400 to $900</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-semibold text-title">Full rewind, 10 to 50 HP</dt>
            <dd className="mt-1 text-secondary">$1,200 to $3,500</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-semibold text-title">Full rewind, 50 to 200 HP</dt>
            <dd className="mt-1 text-secondary">$3,000 to $9,000</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="font-semibold text-title">Emergency surcharge</dt>
            <dd className="mt-1 text-secondary">25 to 50% above the standard rate</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
            <dt className="font-semibold text-title">Freight / pickup</dt>
            <dd className="mt-1 text-secondary">$150 to $600 depending on motor size and distance</dd>
          </div>
        </dl>
        <p className="mt-4 text-secondary leading-relaxed">
          Quotes that come in significantly below these ranges warrant a question about whether EASA AR100 practices
          are being followed, very cheap rewinds often skip core-loss testing, which accelerates re-failure.
        </p>
        <GuideCta href={LISTINGS}>Find a shop and request a quote for your motor →</GuideCta>
        <p className="mt-3">
          <Link href={LISTINGS} className="font-medium text-primary hover:underline">
            Browse repair shops in your state
          </Link>
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          Full cost guide with ranges by HP, repair type, and region:{" "}
          <Link href="/cost-of-motor-repair-and-rewinding" className="font-medium text-primary hover:underline">
            Electric motor repair and rewinding costs
          </Link>
          .
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
          Emergency motor repair: what to do in the next 60 minutes
        </h2>
        <p className="mt-4 text-secondary leading-relaxed">
          If a motor failure is causing active production downtime, these are the steps to take right now. Do not wait
          for a web form reply. Use the location finder on this page to identify shops that already serve your state,
          then call the ones that list emergency or 24-hour intake.
        </p>
        <ol className="mt-6 list-none space-y-5 p-0">
          <li>
            <h3 className="font-semibold text-title">1. Document the failure first.</h3>
            <p className="mt-1 text-secondary leading-relaxed">
              Before anything is touched, photograph the nameplate, the terminal box, and any visible damage. That
              data is needed for every quote and can speed authorization by hours.
            </p>
          </li>
          <li>
            <h3 className="font-semibold text-title">2. Call shops directly, don&apos;t use contact forms.</h3>
            <p className="mt-1 text-secondary leading-relaxed">
              Search the IQMotorBase directory for shops in your state that list emergency service. Call them.
              Emergency authorization happens on the phone, not via a web form.
            </p>
          </li>
          <li>
            <h3 className="font-semibold text-title">3. Tell them your downtime cost.</h3>
            <p className="mt-1 text-secondary leading-relaxed">
              Shops with emergency capacity triage by impact. “This motor is down and costing us $4,000/hour” gets
              different treatment than a generic emergency request. Be specific.
            </p>
          </li>
          <li>
            <h3 className="font-semibold text-title">4. Confirm emergency capability explicitly.</h3>
            <p className="mt-1 text-secondary leading-relaxed">
              Ask: “Can you start this motor today and return it within 48 hours?” Some shops mean next-week priority,
              not same-day intake. Confirm the actual start date and return date before authorizing transport.
            </p>
          </li>
          <li>
            <h3 className="font-semibold text-title">5. Arrange transport, not repair, first.</h3>
            <p className="mt-1 text-secondary leading-relaxed">
              Getting the motor to the shop is usually the bottleneck. Ask whether they can dispatch pickup, many
              emergency-capable shops have trucks. If you arrange freight, use air-ride suspension so transit does not
              add mechanical damage.
            </p>
          </li>
        </ol>
        <GuideCta href={LISTINGS}>Find emergency motor repair shops →</GuideCta>
        <p className="mt-3">
          <Link href={LISTINGS} className="font-medium text-primary hover:underline">
            Browse repair shops in your state
          </Link>
        </p>
        <p className="mt-4 text-secondary leading-relaxed">
          Full emergency motor repair guide:{" "}
          <Link href="/emergency-motor-repair-what-to-do" className="font-medium text-primary hover:underline">
            Emergency motor repair: what to do
          </Link>
          .
        </p>
      </section>

      <section className="mt-16" aria-labelledby="near-me-faq-heading">
        <h2 id="near-me-faq-heading" className="text-2xl font-bold tracking-tight text-title sm:text-3xl">
          Frequently asked questions
        </h2>
        <NearMeFaqAccordion items={NEAR_ME_FAQS} />
      </section>
    </article>
  );
}
