import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import ListYourShopCta from "@/components/marketing/ListYourShopCta";
import { SEO_USA_HUB_PATH } from "@/lib/seo-usa-config";

const path = "/blog/electric-motor-calculators-fla-torque-speed-power";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the difference between estimated FLA and nameplate FLA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nameplate full-load amps (FLA) is manufacturer data for a specific machine at stated voltage, frequency, and service factor. The MotorsWinding estimated FLA calculator approximates input current from output HP, voltage, phase count, efficiency, and power factor. Use estimates for conversations and rough checks; use nameplate FLA for overloads, starters, and code-driven wire sizing.",
      },
    },
    {
      "@type": "Question",
      name: "How does synchronous speed relate to actual motor RPM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Synchronous speed is 120 × frequency ÷ pole pairs (shown as poles in the tool). Induction motors run below synchronous speed because of slip. A 4-pole 60 Hz motor has 1800 RPM synchronous; a loaded motor might run near 1750 RPM depending on design and load.",
      },
    },
    {
      "@type": "Question",
      name: "When do motor shops use belt and pulley speed calculators?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "When verifying driven equipment speed from a known motor speed and pulley diameters, or when explaining ratio changes to customers. The calculator assumes no slip; V-belts and belt creep reduce driven speed slightly compared to the ideal ratio.",
      },
    },
    {
      "@type": "Question",
      name: "How is torque calculated from horsepower and RPM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The dashboard uses standard approximations: torque in lb-ft ≈ 5252 × HP ÷ RPM, and torque in N·m from kW and RPM via the 9550 conversion. Use rated power with rated speed for nameplate torque context.",
      },
    },
    {
      "@type": "Question",
      name: "Should I use the DC Ohm’s law calculator on a running AC motor?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. The Ohm’s law panel is for bench DC circuits. AC motor terminals under load involve impedance, back-EMF, and phase relationships—not resistive DC models.",
      },
    },
    {
      "@type": "Question",
      name: "Why would a rewind shop use delta–wye resistance conversion?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Equivalent Δ and Y resistor networks appear in winding resistance exercises and some theoretical reductions. The tool converts three resistances in delta to wye or the reverse; always use consistent units (ohms) and validate with actual measurements.",
      },
    },
  ],
};

export const metadata = {
  title: "Electric Motor Calculators: FLA, Torque, HP to kW, Speed & Bench Electrical",
  description:
    "What each MotorsWinding dashboard calculator does—HP↔kW, estimated FLA, synchronous speed, belt/pulley RPM, torque, DC Ohm’s law, delta–wye—and when motor repair shops use them.",
  keywords: [
    "motor FLA calculator",
    "HP to kW motor",
    "synchronous speed formula",
    "motor torque calculator",
    "belt pulley speed calculator",
    "delta wye resistance",
    "motor shop calculators",
  ],
  openGraph: {
    title: "Electric Motor Calculators: FLA, Torque, Speed & Power | MotorsWinding.com",
    description:
      "Field-focused math for motor shops: FLA estimates, sync speed, drives, torque, and bench DC tools—explained.",
    url: path,
    type: "article",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Electric motor calculators for repair shops",
    description: "FLA, HP/kW, speed, torque, Ohm’s law, and Δ–Y—what they do and when to use them.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BlogElectricMotorCalculatorsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <BlogPageLayout
        title="Electric motor calculators in your dashboard: FLA, torque, speed &amp; bench electrical"
        description="Motor repair and rewinding shops live in a world of nameplates, field measurements, and quick sanity checks. Here is what each calculator tab does under the hood, when technicians reach for it, and what still belongs on the nameplate or in the code book."
        breadcrumbLink={{ href: "/blog", label: "Blog" }}
        canonicalPath={path}
        sidebarTitle="Try calculators in CRM"
        sidebarDescription="Power, speed, torque, bench electrical, plus CM Best Match for rewinds—all under Dashboard → Calculators."
        sidebarCta={<ListYourShopCta />}
      >
        <article className="prose prose-neutral max-w-none dark:prose-invert">
          <p className="lead text-lg text-secondary leading-relaxed">
            This guide maps directly to the tabs in{" "}
            <Link href="/dashboard/calculators" className="font-medium text-primary hover:underline">
              Dashboard → Calculators
            </Link>
            : <strong className="text-title">Power &amp; current</strong>, <strong className="text-title">Speed &amp; drives</strong>,{" "}
            <strong className="text-title">Torque</strong>, and <strong className="text-title">Bench electrical</strong>. (CM Best Match has its own{" "}
            <Link href="/blog/motor-rewinding-cm-best-match-calculator-guide" className="font-medium text-primary hover:underline">
              CM rewinding guide
            </Link>
            .)
          </p>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Horsepower ↔ kilowatts (why shops still convert)</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Customers quote <strong className="text-title">HP</strong>; drives and import documentation often quote <strong className="text-title">kW</strong>. The dashboard uses a standard IEC-style factor (<strong className="text-title">1 HP ≈ 0.7457 kW</strong>). This is ideal for quotes, emails, and comparing OEM literature—not a substitute for efficiency or service-factor nuances on the nameplate.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">When you need it:</strong> quoting, VFD sizing discussions, import motor replacements, and training new counter staff who bounce between unit systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Estimated full-load amps (FLA)—the honest version</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The tool estimates line current from <strong className="text-title">output HP</strong>, <strong className="text-title">voltage</strong>,{" "}
              <strong className="text-title">single- or three-phase</strong>, <strong className="text-title">efficiency</strong>, and{" "}
              <strong className="text-title">power factor</strong>. It computes mechanical output power in watts, divides by efficiency for input power, then applies the appropriate phase relationship (√3 × V × PF for three-phase balanced; V × PF for single-phase).
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">Critical distinction:</strong> always prioritize <strong className="text-title">nameplate FLA</strong> for overload protection, conductor sizing per <strong className="text-title">NEC</strong> (or local code), and starter selection. Use the estimate when the nameplate is illegible, you are screening a similar replacement, or you need a fast ballpark before the engineer pulls curves.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Synchronous speed (poles, Hz, and slip)</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The calculator applies <strong className="text-title">RPM = 120 × frequency ÷ poles</strong> for AC induction machines. That is <em>synchronous</em> speed—the stator field speed—not loaded shaft speed. Technicians use it to sanity-check pole count from a tach reading or to explain why a “1800 RPM” motor is not actually turning 1800 under load.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">When you need it:</strong> field troubleshooting, VFD output frequency discussions, and customer education on why speed changes with poles and line frequency.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Belt / pulley driven speed</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Given motor RPM and two pulley diameters (same units), the tool applies the speed ratio <strong className="text-title">driven RPM = motor RPM × (driver Ø ÷ driven Ø)</strong>. It assumes no belt slip.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">When you need it:</strong> pump and fan alignment conversations, field modifications, and quick checks before ordering sheaves. Mention timing belt effective diameter and V-belt creep when accuracy matters.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Torque from power and speed</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The torque tab outputs <strong className="text-title">lb-ft</strong> and <strong className="text-title">N·m</strong> from either HP or kW plus shaft RPM. The constants <strong className="text-title">5252</strong> (HP–RPM–lb-ft) and <strong className="text-title">9550</strong> (kW–RPM–N·m) are standard approximations used across the industry.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">When you need it:</strong> coupling selection, comparing motors at different speeds, and explaining why lowering speed with the same power changes torque demand in drivetrain discussions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">DC Ohm’s law &amp; power (bench work)</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Enter any two of <strong className="text-title">V</strong>, <strong className="text-title">I</strong>, <strong className="text-title">R</strong>, <strong className="text-title">P</strong>; the panel solves the rest for <strong className="text-title">DC</strong> resistive circuits. It flags inconsistent combinations.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">When you need it:</strong> bench power supplies, shunt checks, heater strips, and training—not for modeling a spinning induction motor under load.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Three-phase resistor networks (Δ ↔ Y)</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Convert three resistances between <strong className="text-title">delta</strong> and <strong className="text-title">wye</strong> equivalent networks. Use consistent ohms and treat results as theoretical equivalents for study or rough planning—always confirm with measured winding resistance and your shop’s procedures.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              <strong className="text-title">When you need it:</strong> winding resistance coursework, equivalent-circuit homework on the floor, and double-checking handwritten conversions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Mobile technicians and calculators</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              The technician mobile app mirrors many of the same calculator categories for shop-floor use. For workflow context, see{" "}
              <Link href="/technician-mobile-app-shop-floor-first" className="font-medium text-primary hover:underline">
                Technician mobile app (shop-floor first)
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">Frequently asked questions</h2>
            <div className="mt-6 space-y-6 text-secondary">
              <div>
                <h3 className="text-lg font-semibold text-title">Estimated FLA vs nameplate FLA?</h3>
                <p className="mt-2 leading-relaxed">
                  Estimate from HP, voltage, efficiency, and PF; nameplate FLA governs protection and code-driven design in the field.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Why is synchronous speed not shaft speed?</h3>
                <p className="mt-2 leading-relaxed">
                  Induction motors slip; synchronous RPM is the rotating field speed from poles and Hz.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Belt calculator accuracy?</h3>
                <p className="mt-2 leading-relaxed">
                  Ideal ratio with no slip; real belts creep—use as a first pass before final sheave selection.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Torque formulas?</h3>
                <p className="mt-2 leading-relaxed">
                  lb-ft from HP and RPM via 5252; N·m from kW and RPM via 9550—shown live in the dashboard.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Ohm’s law on motors?</h3>
                <p className="mt-2 leading-relaxed">
                  Bench DC only; running AC motors need impedance models, not simple V = IR.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-title">Delta–wye use case?</h3>
                <p className="mt-2 leading-relaxed">
                  Equivalent three-resistor conversions for study and planning—verify with measurements on real windings.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-12 border-t border-border pt-10">
            <h2 className="text-xl font-bold text-title sm:text-2xl">Related reading</h2>
            <ul className="mt-4 space-y-2 text-secondary">
              <li>
                <Link href="/blog/motor-rewinding-cm-best-match-calculator-guide" className="font-medium text-primary hover:underline">
                  CM Best Match calculator for motor rewinding
                </Link>
              </li>
              <li>
                <Link href="/blog/how-to-manage-repair-jobs-efficiently" className="font-medium text-primary hover:underline">
                  How to manage repair jobs efficiently
                </Link>
              </li>
              <li>
                <Link href={SEO_USA_HUB_PATH} className="font-medium text-primary hover:underline">
                  USA motor repair business listing
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </BlogPageLayout>
    </>
  );
}
