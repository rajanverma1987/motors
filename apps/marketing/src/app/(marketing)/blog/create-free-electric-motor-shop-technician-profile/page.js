import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";

const path = "/blog/create-free-electric-motor-shop-technician-profile";

const faqItems = [
  {
    q: "Is an 3PhaseFlow talent profile really free for job seekers?",
    a: "Yes. Creating and editing a talent profile is free. You sign in with email OTP, fill your skills and preferred work areas, and can apply to open Careers roles with no paid seeker plan.",
  },
  {
    q: "Do I need a password to create an electric motor shop technician profile?",
    a: "No. Talent sign-in uses a 6-digit email code only. Enter your email, verify the code, and you land on your profile editor. Returning users use the same email plus a fresh code.",
  },
  {
    q: "What jobs can I find with a motor rewind or technician profile?",
    a: "Shops post roles such as winder, technician, machinist, field technician, apprentice, supervisor, sales, and office support on the public Careers page. Matching depends on your skills, preferred states, and whether job alerts are on.",
  },
  {
    q: "How do location-matched job alerts work?",
    a: "When a shop lists an open role on Careers, 3PhaseFlow emails seekers whose preferred work areas overlap the job location and who are not marked Not available for hire. Every alert includes an unsubscribe option.",
  },
  {
    q: "Can I hide from hiring or stop alerts without deleting my profile?",
    a: "Yes. Set hiring availability to Not available for hire. You can still edit your profile. Job alerts stay off until you switch back to Available now or Open to opportunities.",
  },
  {
    q: "Why can’t I apply as a guest anymore?",
    a: "Guest forms often lack skills, resume context, and a durable identity shops can review later. Apply with profile sends shops a real seeker record linked to your public talent page.",
  },
  {
    q: "What should I put on my profile to rank higher in the talent directory?",
    a: "Use a clear headline (role plus years), accurate home state and preferred areas, relevant skills (motor rewind, machining, VFD, field service, and more), availability, and a PDF resume when you have one. Higher completeness scores stand out when shops browse Talent.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export const metadata = {
  title: "Create a Free Electric Motor Shop Technician Profile | 3PhaseFlow Talent",
  description:
    "Step-by-step guide to a free 3PhaseFlow talent profile for motor rewind technicians, winders, machinists, and field techs: OTP sign-in, skills, job alerts, Careers apply, and directory SEO tips.",
  keywords: [
    "electric motor shop jobs",
    "motor rewind technician jobs",
    "electric motor repair careers",
    "motor winder jobs",
    "field service technician electric motor shop",
    "free job seeker profile",
    "motor repair shop hiring",
    "electric motor technician resume",
    "3PhaseFlow talent",
  ],
  openGraph: {
    title: "Create a Free Electric Motor Shop Technician Profile | 3PhaseFlow",
    description:
      "Free OTP talent profiles for winders and technicians: public directory, location-matched alerts, and apply with profile on Careers.",
    url: path,
    type: "article",
    siteName: "3PhaseFlow.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free electric motor shop technician profile on 3PhaseFlow Talent",
    description:
      "How job seekers create a free profile, get location-matched alerts, and apply to motor repair shop careers.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BlogTalentProfilePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <BlogPageLayout
        title="Create a free electric motor shop technician profile"
        description="Shops on 3PhaseFlow post open roles on Careers. Job seekers get a free public profile, location-matched alerts, and one-tap apply with no guest forms. This guide covers who it is for, what to fill, and how to get found."
        breadcrumbLink={{ href: "/blog", label: "Blog" }}
        canonicalPath={path}
        sidebarTitle="Start free"
        sidebarDescription="Email OTP sign-in. No password. Complete your skills and preferred states so alerts hit the right jobs."
        sidebarCta={
          <Link
            href="/talent/login"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Create free profile
          </Link>
        }
      >
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="lead text-lg text-secondary leading-relaxed">
            If you work in electric motor repair, rewinding, machining, balancing, VFD and controls, or field service,
            shops need a clear way to find you. Generic job boards bury niche trade skills under thousands of unrelated
            listings. 3PhaseFlow{" "}
            <Link href="/talent" className="text-primary font-medium hover:underline">
              Talent
            </Link>{" "}
            is a free public directory built for electric motor shop professionals. Create a profile with your email, document
            what you can do on the bench or in the plant, and get notified when a matching role goes live on{" "}
            <Link href="/careers" className="text-primary font-medium hover:underline">
              Careers
            </Link>
            .
          </p>

          <p className="mt-4 text-secondary leading-relaxed">
            This page is the full playbook for job seekers: why a shop-specific profile beats a guest apply form, how
            OTP sign-in works, which fields improve matches, how alerts and apply flow, and how shop owners use the same
            system to hire. Use it as your checklist before you{" "}
            <Link href="/talent/login" className="text-primary font-medium hover:underline">
              create or edit your free profile
            </Link>
            .
          </p>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Who should create an electric motor shop talent profile
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              3PhaseFlow Talent is for people who already work in (or are training for) electric motor and industrial
              repair shops, not for unrelated office-only job hunting. Typical roles include:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-secondary">
              <li>
                <strong className="text-title">Winders and rewind technicians</strong> who strip, rewind, varnish, and
                test AC/DC motors and generators.
              </li>
              <li>
                <strong className="text-title">Shop technicians</strong> who diagnose failures, replace bearings,
                rebuild mechanical assemblies, and run test panels.
              </li>
              <li>
                <strong className="text-title">Machinists</strong> who turn shafts, fabricate sleeves, and support
                mechanical rebuilds for electric motor shops.
              </li>
              <li>
                <strong className="text-title">Field technicians</strong> who pull motors, align couplings, and support
                plant outages on site.
              </li>
              <li>
                <strong className="text-title">Apprentices and juniors</strong> building shop hours who want visibility
                with shops that hire and train.
              </li>
              <li>
                <strong className="text-title">Supervisors, QC, sales, and shop admin</strong> supporting motor repair
                operations who want roles at listed shops.
              </li>
            </ul>
            <p className="mt-4 text-secondary leading-relaxed">
              If your day involves nameplates, insulation resistance, vibration, varnish bake cycles, or inverter-duty
              motors, a Talent profile speaks the same language as the shops posting on Careers.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Why electric motor shop hiring is different from generic job boards
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Industrial motor repair hiring is skill-dense and geography-sensitive. A shop in Texas looking for a
              mid-level winder does not want to dig through warehouse or retail applications. Owners also need to see
              whether you are available now, open to the right role, or not looking, before they spend time on a
              phone screen.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              3PhaseFlow already lists repair shops and runs a{" "}
              <Link
                href="/motor-repair-shop-management-software"
                className="text-primary font-medium hover:underline"
              >
                Shop Management System
              </Link>{" "}
              where owners post employee openings. Talent and Careers sit on that same network: seekers publish skills
              and preferred states; shops publish roles; location-matched alerts connect the two when a posting goes
              live.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              That is why guest apply was removed. A one-off form without a durable profile creates weak applications
              and dead-end inboxes. A public seeker page with skills, resume, and availability gives shops something
              they can reopen from their dashboard after you apply.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Why a free public profile helps you get hired
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              A complete talent profile does three jobs at once:
            </p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-secondary">
              <li>
                <strong className="text-title">Discovery.</strong> Shops browse the{" "}
                <Link href="/talent" className="text-primary font-medium hover:underline">
                  talent directory
                </Link>{" "}
                by skill, state, and availability. Your page can surface even before you apply to a specific job.
              </li>
              <li>
                <strong className="text-title">Credibility.</strong> Headline, years of experience, skills (motor
                rewind, machining, VFD/controls, field service, balancing, QC), and an optional PDF resume show you are
                serious about shop work.
              </li>
              <li>
                <strong className="text-title">Speed.</strong> When you click Apply with profile on a Careers listing,
                the shop receives your linked seeker record instead of a blank form. Less typing for you, more context
                for them.
              </li>
            </ol>
            <p className="mt-4 text-secondary leading-relaxed">
              Profiles are free for job seekers. There is no credit card and no password to manage. You control whether
              you appear as available, open, or not available for hire.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              How sign-in works (email OTP only)
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Go to{" "}
              <Link href="/talent/login" className="text-primary font-medium hover:underline">
                talent sign-in
              </Link>
              . The page explains benefits for seekers and walks you through three steps:
            </p>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-secondary">
              <li>
                <strong className="text-title">Enter your email.</strong> Use an address you check often. Job alerts and
                apply confirmations go there. We send a 6-digit code. No password is created or stored for talent
                accounts.
              </li>
              <li>
                <strong className="text-title">Verify the code.</strong> Check inbox and spam. After verify, you land on
                your profile editor. First-time users get a new empty profile; returning users reopen the same record
                to edit.
              </li>
              <li>
                <strong className="text-title">Complete and save.</strong> Add contact details, skills, preferred areas,
                availability, and resume. Turn on job alerts if you want location matches. Mark Not available for hire
                when you want to pause alerts without deleting the profile.
              </li>
            </ol>
            <p className="mt-4 text-secondary leading-relaxed">
              OTP reduces abandoned sign-ups. Skilled tradespeople often dislike yet another password. A short email
              code is enough to prove you own the inbox shops will use to contact you.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              What to fill for better matches and directory visibility
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Completeness score on your profile reflects how ready you look to hiring shops. Higher scores tend to
              stand out when owners sort or scan the directory. Treat the form like a shop floor resume, not a social
              bio.
            </p>

            <h3 className="mt-8 text-xl font-semibold text-title">Core identity</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-secondary">
              <li>
                <strong className="text-title">Full name and phone</strong> so shops can reach you after an apply.
              </li>
              <li>
                <strong className="text-title">Headline</strong> that names the role and experience level, for example
                &quot;Motor rewind technician, 8 years AC/DC shop&quot; or &quot;Field tech, plant motors and
                alignment.&quot;
              </li>
              <li>
                <strong className="text-title">Role and experience level</strong> (entry, mid, senior, lead) so filters
                and shop expectations stay honest.
              </li>
              <li>
                <strong className="text-title">Employment preference</strong> such as full time, part time, contract, or
                temporary when that matters for your search.
              </li>
            </ul>

            <h3 className="mt-8 text-xl font-semibold text-title">Location and preferred work areas</h3>
            <p className="mt-3 text-secondary leading-relaxed">
              Set your home state and the states or regions where you will actually take a job. Alerts match preferred
              areas to the job location on Careers. If you only want work in your home state, keep preferred areas
              tight. If you will relocate for the right senior winder role, add those states deliberately so you are
              not flooded with distant alerts you will ignore.
            </p>

            <h3 className="mt-8 text-xl font-semibold text-title">Skills shops search for</h3>
            <p className="mt-3 text-secondary leading-relaxed">
              Select every skill you can defend in an interview. Common tags on Talent include motor rewind, machining,
              field service, electrical, troubleshooting, balancing, welding, VFD/controls, QC/inspection, shop
              management, sales, and logistics. Over-tagging hurts trust. Under-tagging hides you from directory
              filters.
            </p>

            <h3 className="mt-8 text-xl font-semibold text-title">Hiring availability</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-secondary">
              <li>
                <strong className="text-title">Available now:</strong> shops see you as ready to start; alerts stay on
                if enabled.
              </li>
              <li>
                <strong className="text-title">Open to opportunities:</strong> you are selective but reachable; alerts
                stay on if enabled.
              </li>
              <li>
                <strong className="text-title">Not available for hire:</strong> you can keep editing; public page shows
                you are not looking; job alerts stay off until you change status.
              </li>
            </ul>

            <h3 className="mt-8 text-xl font-semibold text-title">Resume PDF</h3>
            <p className="mt-3 text-secondary leading-relaxed">
              Upload a PDF when you have one. Shop owners reviewing applicants often open the resume next to your
              profile skills. Keep it current: voltage ranges you have worked, EASA-aligned practices if relevant,
              safety training, and shop tools you run daily.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Job alerts: how location matching works
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              When a shop posts an open employee role and it is listed on the public Careers page, 3PhaseFlow looks
              for seekers whose preferred areas overlap the job location, who have verified email, who have alerts
              enabled, and who are not marked Not available for hire. Matching seekers get an email with the role
              context and a path to the job page.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Every alert includes an unsubscribe path. You can also turn alerts off from your profile or switch
              availability to Not available for hire if you are employed and do not want outreach. Returning to Available
              now or Open to opportunities and enabling alerts brings matching back.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Tip: keep preferred areas realistic. Broad &quot;anywhere USA&quot; preferences create noise. Tight
              regional preferences create actionable alerts for roles you might actually take.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Applying on Careers with your profile
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Browse open motor repair shop jobs on{" "}
              <Link href="/careers" className="text-primary font-medium hover:underline">
                Careers
              </Link>
              . On a job page, use Apply with profile after you are signed in. You need a full name on the profile
              before submit. The shop receives your application linked to your seeker record so they can open your
              public talent page from their hiring workflow.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Guest apply is no longer available. That protects shops from incomplete spam and protects serious seekers
              from competing with throwaway forms. If you are mid-apply and not signed in, the job page walks you
              through the same email OTP flow, then returns you to apply.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              How to write a strong electric motor shop headline and summary
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              Hiring managers skim. Lead with the job they are trying to fill, then proof:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-secondary">
              <li>
                Weak: &quot;Hard worker looking for opportunity.&quot;
              </li>
              <li>
                Stronger: &quot;AC/DC winder, 6 years, form-wound and random-wound, vacuum pressure impregnation
                experience.&quot;
              </li>
              <li>
                Stronger: &quot;Field service tech, 480 V industrial motors, laser alignment, overnight outage
                support.&quot;
              </li>
              <li>
                Stronger: &quot;Shop machinist supporting motor rebuilds: shafts, sleeves, keyways, press fits.&quot;
              </li>
            </ul>
            <p className="mt-4 text-secondary leading-relaxed">
              In your summary, name equipment classes you know (pump motors, explosion-proof, inverter-duty, DC mills),
              test equipment you use, and whether you prefer bench, field, or mixed work. Avoid fluff. Shops hire for
              throughput and safety, not buzzwords.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              Privacy, control, and editing after login
            </h2>
            <p className="mt-4 text-secondary leading-relaxed">
              After you verify email, you can return anytime via{" "}
              <Link href="/talent/login" className="text-primary font-medium hover:underline">
                /talent/login
              </Link>{" "}
              to edit skills, locations, resume, and availability. Use Not available for hire when you accept a job or
              pause your search. That keeps your profile for future edits without sending new alerts.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Use a professional email you will keep. If you lose access to the inbox, you lose OTP access to that
              profile. Do not share verification codes. Treat the code like a temporary password.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">For shop owners hiring technicians</h2>
            <p className="mt-4 text-secondary leading-relaxed">
              If you run a motor repair or rewinding business, post open employee roles from job posting settings in the
              Shop Management System. When the posting is open and listed on the marketing Careers page, matching
              talent with overlapping preferred areas can get notified. You can also browse the public{" "}
              <Link href="/talent" className="text-primary font-medium hover:underline">
                talent directory
              </Link>{" "}
              anytime to find winders, technicians, and field talent by skill and location.
            </p>
            <p className="mt-4 text-secondary leading-relaxed">
              Applicants who use Apply with profile arrive with a linked seeker record. That keeps hiring conversations
              attached to real skills and resumes instead of anonymous web forms. For shop growth beyond hiring, see{" "}
              <Link
                href="/blog/how-to-get-more-customers-for-motor-repair-shop"
                className="text-primary font-medium hover:underline"
              >
                how to get more customers for a motor repair shop
              </Link>{" "}
              and the{" "}
              <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
                list your shop
              </Link>{" "}
              flow.
            </p>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">
              15-minute checklist before you hit save
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-secondary">
              <li>Sign in at talent login with a monitored email and verify the 6-digit code.</li>
              <li>Write a role-first headline with years of experience.</li>
              <li>Set home state and only the preferred areas you would actually take.</li>
              <li>Select honest skills (rewind, machining, VFD, field service, and so on).</li>
              <li>Choose Available now, Open to opportunities, or Not available for hire.</li>
              <li>Enable job alerts only if you want location-matched Careers emails.</li>
              <li>Upload a PDF resume if you have one.</li>
              <li>Save, then open your public talent page and fix anything unclear.</li>
              <li>Browse Careers and apply with profile to roles that fit.</li>
            </ol>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div key={item.q}>
                  <h3 className="text-lg font-semibold text-title">{item.q}</h3>
                  <p className="mt-2 text-secondary leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">Related resources</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-secondary">
              <li>
                <Link href="/talent" className="text-primary font-medium hover:underline">
                  Motor shop talent directory
                </Link>
              </li>
              <li>
                <Link href="/talent/login" className="text-primary font-medium hover:underline">
                  Create or sign in to your free profile
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-primary font-medium hover:underline">
                  Browse open motor repair shop jobs
                </Link>
              </li>
              <li>
                <Link
                  href="/motor-repair-shop-management-software"
                  className="text-primary font-medium hover:underline"
                >
                  Shop Management System for repair shops
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/how-to-manage-repair-jobs-efficiently"
                  className="text-primary font-medium hover:underline"
                >
                  How to manage repair jobs efficiently
                </Link>
              </li>
            </ul>
          </section>

          <p className="mt-10 text-secondary leading-relaxed">
            Ready?{" "}
            <Link href="/talent/login" className="font-semibold text-primary hover:underline">
              Create your free talent profile
            </Link>{" "}
            or{" "}
            <Link href="/careers" className="font-semibold text-primary hover:underline">
              browse open electric motor shop jobs
            </Link>
            . Shops are already posting. A complete profile is how they find you.
          </p>
        </article>
      </BlogPageLayout>
    </>
  );
}
