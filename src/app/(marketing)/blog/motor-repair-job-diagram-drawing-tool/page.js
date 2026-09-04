import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";
import SeoLeadMiniForm from "@/components/marketing/SeoLeadMiniForm";
import SoftwareDemoBookingPanel from "@/components/marketing/SoftwareDemoBookingPanel";
import {
  SEO_SOFTWARE_PILLAR_PATH,
  SEO_SOFTWARE_WORK_ORDER_PATH,
} from "@/lib/seo-software-paths";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const path = "/blog/motor-repair-job-diagram-drawing-tool";
const OG_IMAGE_PATH = "/images/og-motor-repair-job-diagram-drawing-tool.png";
const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
const ogImageUrl = `${siteUrl}${OG_IMAGE_PATH}`;

const TITLE = "Job Diagram Drawing Tool for Motor Repair Shops | IQMotorBase";
const DESCRIPTION =
  "Why paper sketches and phone photos fail motor shops, how IQMotorBase’s tablet-with-pen job diagram tool works from the datasheet, and how linked drawings protect handoffs and warranties.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "motor repair diagram tool",
    "job diagram software",
    "motor shop drawing tool",
    "electric motor datasheet diagram",
    "repair shop sketch tool",
    "winding connection diagram",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "Technician drawing a motor connection diagram on a tablet with a pen in a rewind shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [ogImageUrl],
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BlogJobDiagramDrawingToolPage() {
  return (
    <BlogPageLayout
      title="Draw job diagrams where the work lives"
      description="Every good motor shop already draws. The question is whether that drawing still exists when second shift, the office, or the customer needs it. We built a diagram tool inside the job so a tech can sketch on a tablet with a pen, save it with the datasheet, and keep the record with the job number."
      breadcrumbLink={{ href: "/blog", label: "Blog" }}
      canonicalPath={path}
      heroImage={OG_IMAGE_PATH}
      heroImageAlt="Technician drawing a motor job diagram on a shop tablet with a stylus pen"
      sidebarTitle="Book a demo"
      sidebarDescription="See datasheets, tablet pen drawing, and your shop workflow in one live walkthrough."
      sidebarCta={<SeoLeadMiniForm sourcePage={path} submitLabel="Book a demo" />}
    >
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <p className="mt-2 text-secondary leading-relaxed">
            Walk any busy rewind shop at 2 p.m. and you will see the same scene. A tech has the end bell off, leads tagged
            with tape, and a half-finished sketch on a yellow pad: which coils were burned, how the board was landed, what
            color went where before someone cut it free. That sketch is not busywork. It is the job&apos;s memory. Lose it,
            and you pay later in rework, arguments, and awkward customer calls.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Most shops already know this. They have tried whiteboards, phone photos, scanned pads, and &quot;just put it in
            the notes.&quot; The failure is rarely effort. The failure is that the drawing does not live with the job number
            the way nameplate data and quote lines do. So when the motor moves from teardown to rewind to test, the picture
            that mattered stays behind on a bench, in a text thread, or in a camera roll named IMG_4821.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            That is the gap we set out to close. Not another graphics program for the office. A drawing tool that opens from
            the datasheet on a shop tablet, works with a pen (stylus) the way a tech already sketches, saves on the job, and
            lets a shop keep more than one diagram when the work needs it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            The problem motor shops actually feel
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Motor repair is visual work. Nameplate fields matter, but they do not replace a connection sketch. A DC armature
            with odd lead dress, a form-wound stator with a special jump, a terminal board that was never factory standard:
            those details decide whether reassembly matches what the customer had in the plant. When the only record is in
            one tech&apos;s head, you are one vacation day away from a slow, expensive guess.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Paper fails in predictable ways. The pad stays under a pile of scrap copper. Grease smears the lead colors.
            Someone photocopies a sketch and writes over it, so nobody knows which version is as-found versus as-left. The
            office asks for &quot;the drawing&quot; when the customer wants a copy with the invoice, and the floor shrugs
            because that job shipped two weeks ago.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Phone photos feel modern until they are not. The photo is sharp enough on the phone, then too dark on a laptop.
            It never gets uploaded because the tech was still in gloves. When it does get uploaded, it lands as a generic
            attachment with no label, next to a packing slip and a random PDF. Second shift opens the job and still has to
            ask, &quot;Which picture is the board before we moved anything?&quot;
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Shared drives and email folders create a different mess. One person saves Motor_Diagram_Final. Another saves
            Motor_Diagram_Final_v2. A third emails a photo to the estimator and never files it. Months later, on a warranty
            call, you cannot prove what you documented at teardown. You only have what people remember under pressure.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Generic shop software does not solve this either if &quot;attachments&quot; is the only answer. Attachments are
            storage. Shops need a place to <em>draw</em>, tied to the same record as the AC or DC datasheet, with a clear way
            to keep multiple drawings for one motor. Connection map, damage callouts, and as-left layout are not the same
            page. Forcing them onto one overwritten scan is how details disappear.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            What this costs when it goes wrong
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Lost diagrams do not show up as a neat line on a P&amp;L. They show up as overtime on a Friday when someone has to
            open a motor again to &quot;check how it was.&quot; They show up as a customer who gets a motor back and says the
            leads are not how their electrician left them. They show up as an estimator quoting soft because the teardown notes
            are incomplete, then eating margin when the real connection work appears mid-job.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Handoffs suffer most. Day shift tears down and sketches. Night shift winds. If the sketch is not on the job, night
            shift either waits, guesses, or texts the day guy. Waiting burns schedule. Guessing burns quality. Texting burns
            people&apos;s personal time and still leaves no permanent record for the next person.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Warranty and liability conversations get harder without a dated drawing on the job. When a plant says, &quot;You
            changed our connection,&quot; you want to open the job and show as-found and as-left, not dig through a group chat.
            Shops that document well do not win every dispute, but they waste less time proving they did the work carefully.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Training is quieter collateral damage. New techs learn by watching seniors draw. If those drawings vanish, every
            new hire relearns tribal habits instead of reading a clear job history. That slows capacity even when you hire.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">What we built in IQMotorBase</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            We put the drawing tool where technicians already capture motor truth: inside the datasheet for the job. From the
            AC or DC datasheet screen, a tech opens <strong className="font-semibold text-title">Draw/View Diagram</strong>{" "}
            and works on a full canvas without bouncing to a separate design app or hoping an email attachment gets filed later.
            On a shop tablet, that canvas is large enough to sketch at the bench, not hunched over a phone keyboard.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Shops can start on blank paper or from blank designs you control. Platform and shop diagram templates give a
            consistent background for the sketches your people repeat often. That matters more than it sounds. When every
            connection diagram starts from the same clean layout, reviews go faster and printouts look like shop standards,
            not random notebook pages.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Drawing is built for tablet with pen, not desktop art software. A tech can hold a tablet at the motor, use a
            stylus the same way they use a Sharpie on a pad, and mark lead colors, jumpers, and burned sections while the
            detail is still in front of them. Pen colors, pen size, eraser, undo, and clear are there for floor markup.
            Mouse still works at a desk if the office needs to tidy a page, but the primary path is pen on tablet so the
            sketch happens at teardown, not hours later from memory.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Pressure-friendly pointer input matters on a greasy floor. A pen is faster and more accurate than a fingertip for
            small connection marks, and it does not force the tech to take gloves off just to type a paragraph. Finish the
            diagram between steps, save it, and keep moving.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            One diagram is rarely enough on a real job. A motor can need an as-found board sketch, a damage map, and an as-left
            connection page. So a job can hold multiple diagrams. Techs can add another, open an existing one, edit it, replace
            it, or delete it without wiping the rest of the set. That matches how work actually unfolds across teardown,
            repair, and final check.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            When the drawing is saved, it stays on the service proposal / job record with the datasheet. Print is available when
            the bench wants a hard copy in a traveler pack, or when the office wants a clean page for the customer. Copying a
            job forward can carry diagrams with the new RFQ when you need that continuity, instead of starting from a blank
            memory every time.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Admins and shop settings can manage the blank designs. That lets a shop standardize the templates that match its
            common frames and connection styles, while still leaving blank paper for the odd job that does not fit a template.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            How a job day looks with diagrams on the record
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Intake still starts the same way: customer, motor, job number. When the tech opens the datasheet and begins
            teardown notes, the diagram tool is right there on the tablet. Before leads come off, they sketch the board with
            the pen. Before a burned section is cut out, they mark it. If the motor is odd enough to need a second page, they
            add another diagram instead of erasing the first.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Mid-job, the estimator or supervisor can open the same job and see what the floor saw without walking the aisle and
            interrupting a winding setup. That shortens quote turnaround on complex repairs, because the visual evidence is
            already attached to the numbers.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            At test and ship, the as-left drawing is still on the job. If the customer asks for documentation with the invoice,
            the office is not hunting. If a warranty call comes six months later, the job history still includes the drawings
            made when the work was fresh.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            This is the same discipline shops already want for statuses and parts: one source of truth. Diagrams finally join
            that list instead of living as orphan photos.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">How it helps owners and floor leads</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            For owners, the win is less firefighting and cleaner accountability. When documentation is expected on the job, you
            can coach to a standard: if the connection changed, there should be a drawing. That is easier to manage than
            &quot;make sure you take a picture sometime.&quot;
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            For floor leads, handoffs get quieter. Night shift stops starting from zero. Cross-trained techs can pick up a job
            and read the visual story before they touch leads. That protects schedule when absenteeism or rush work scrambles
            who owns which motor.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            For the office, customer communication gets more concrete. You can explain scope with the job open, not with vague
            promises that &quot;the guys drew it somewhere.&quot; When a plant engineer asks for a connection reference, you
            send what is on the job instead of rebuilding a sketch from memory under deadline pressure.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            For quality and warranty posture, dated drawings on the job are evidence of process. They will not replace a formal
            QA program, but they close the gap where shops lose arguments simply because the record was incomplete.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            And for shops already moving quotes, work orders, and invoices onto one job number, diagrams stop being the
            leftover analog step. They belong in the same{" "}
            <Link href={SEO_SOFTWARE_PILLAR_PATH} className="font-medium text-primary hover:underline">
              motor repair shop management software
            </Link>{" "}
            flow as the rest of the job, including{" "}
            <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="font-medium text-primary hover:underline">
              work orders
            </Link>{" "}
            that depend on clear as-found and as-left detail.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            What this is not (so expectations stay honest)
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            This is not CAD for machine design. It will not replace engineering drawings for new apparatus builds. It is a
            shop-floor diagram tool for repair reality: fast markup, clear enough for the next tech and the customer file,
            saved on the job.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            It also does not remove the need for good habits. A tool only helps if teardown still pauses long enough to capture
            the board before leads are cut. The difference is that when the tech does the right thing, the work is not wasted
            two hours later when the pad gets buried.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Shops that win with this treat diagrams like nameplate data: required on complex jobs, reviewed at handoff, and
            available at ship. Software makes that standard enforceable. Culture still has to ask for it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">
            A practical way to roll it out in your shop
          </h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Start with the jobs that hurt most when sketches vanish: odd connections, DC work, form-wound repairs, and anything
            with customer-specific lead dress. Require at least one as-found diagram before teardown progresses past the point
            of no return.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Next, add as-left diagrams on jobs where the connection changed or the customer asked for documentation. Keep damage
            callouts on a separate diagram when the page would get crowded. Crowded drawings hide the exact thing someone will
            need later.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Load a few blank designs that match your common work. Train one lead per shift first, then make the expectation
            clear in the daily huddle: if it was drawn on paper before, it gets drawn on the job now. Review a couple of jobs
            each week for the first month so the habit sticks.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Measure the quiet wins. Fewer &quot;how was this landed?&quot; interruptions. Fewer warranty debates with no
            paperwork. Faster answers when a customer asks for a copy. Those are the returns shops feel before they ever look
            at a dashboard chart.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-title sm:text-3xl mt-10">See it on a live demo</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            If your team still loses sketches between teardown and ship, a demo is the fastest way to judge fit. We will open a
            real datasheet flow, draw on a job with tablet and pen in mind, save more than one diagram, print a page, and show
            how that sits next to quotes and work orders under one job number.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Bring the pain points you already know: second-shift handoffs, warranty documentation, customer requests for
            connection drawings, or the last job that got reopened because nobody trusted the photo. We will map the tool to
            those moments, not a generic slideshow.
          </p>
          <p className="mt-4 text-secondary leading-relaxed">
            Book a short walkthrough when you are ready. Fifteen focused minutes beats another month of hoping the next yellow
            pad does not disappear under the bench.
          </p>
        </section>

        <div className="not-prose mt-10">
          <SoftwareDemoBookingPanel sourcePage={path} layout="inline" />
        </div>

        <section className="mt-10 border-t border-border pt-10">
          <h2 className="text-xl font-bold text-title sm:text-2xl">Related reading</h2>
          <ul className="mt-4 space-y-2 text-secondary">
            <li>
              <Link
                href="/blog/how-to-manage-repair-jobs-efficiently"
                className="font-medium text-primary hover:underline"
              >
                How to manage repair jobs efficiently
              </Link>
            </li>
            <li>
              <Link href="/blog/best-software-for-repair-shop-2026" className="font-medium text-primary hover:underline">
                Best software for a repair shop in 2026
              </Link>
            </li>
            <li>
              <Link href={SEO_SOFTWARE_WORK_ORDER_PATH} className="font-medium text-primary hover:underline">
                Work order software for motor repair shops
              </Link>
            </li>
            <li>
              <Link href={SEO_SOFTWARE_PILLAR_PATH} className="font-medium text-primary hover:underline">
                Motor repair shop management software
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </BlogPageLayout>
  );
}
