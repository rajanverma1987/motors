import Link from "next/link";
import BlogPageLayout from "@/components/marketing/BlogPageLayout";

const path = "/blog/create-free-motor-shop-technician-profile";

export const metadata = {
  title: "Create a Free Motor Shop Technician Profile | IQMotorBase Talent",
  description:
    "Build a free public talent profile for motor rewind, machining, and field service roles. Get location-matched job alerts and apply to shop careers with email OTP sign-in.",
  keywords: [
    "motor shop jobs",
    "motor rewind technician jobs",
    "electric motor repair careers",
    "free job seeker profile",
  ],
  openGraph: {
    title: "Create a Free Motor Shop Technician Profile | IQMotorBase",
    description: "Free OTP talent profiles, job alerts, and careers apply for winders and technicians.",
    url: path,
    type: "article",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

export default function BlogTalentProfilePage() {
  return (
    <BlogPageLayout
      title="Create a free motor shop technician profile"
      description="Shops on IQMotorBase post open roles on Careers. Job seekers get a free public profile, location-matched alerts, and one-tap apply with no guest forms."
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
        <p className="text-secondary leading-relaxed">
          If you work in motor repair, rewinding, machining, or field service, shops need to find you. IQMotorBase{" "}
          <Link href="/talent" className="text-primary font-medium hover:underline">
            Talent
          </Link>{" "}
          is a free public directory built for that. Create a profile with your email, fill in your experience, and get
          notified when a matching job goes live on{" "}
          <Link href="/careers" className="text-primary font-medium hover:underline">
            Careers
          </Link>
          .
        </p>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">Why a free profile helps you get hired</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Guest apply forms disappear into inboxes. A public profile shows availability, preferred areas, skills, and a
            resume link. Shop owners reviewing applicants can open your full profile from their dashboard.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">How sign-in works (OTP only)</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Go to{" "}
            <Link href="/talent/login" className="text-primary font-medium hover:underline">
              talent sign-in
            </Link>
            , enter a valid email, and we send a 6-digit code. No password to forget. After verify, you land on your
            profile editor.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">What to fill for better matches</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-secondary">
            <li>Full name, phone, and a clear headline (role + years).</li>
            <li>Home state plus preferred work areas so job alerts match location.</li>
            <li>Skills such as motor rewind, machining, VFD, field service.</li>
            <li>Availability signal: available now, open, or not looking.</li>
            <li>PDF resume when you have one.</li>
          </ul>
          <p className="mt-4 text-secondary leading-relaxed">
            Completeness score on your profile shows how ready you look to hiring shops. Higher scores stand out in the
            directory.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">Job alerts and applying</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            When a shop posts an open role listed on Careers, we email seekers whose preferred areas match the job
            location. Every alert includes an unsubscribe link. To apply, sign in and use Apply with profile on the job
            page. Guest apply is no longer available so shops always get a real profile.
          </p>
        </section>

        <section>
          <h2 className="mt-10 text-2xl font-bold text-title sm:text-3xl">For shop owners</h2>
          <p className="mt-4 text-secondary leading-relaxed">
            Post roles from the Shop Management System job postings settings. When the posting is open and listed on the
            marketing site, matching talent gets notified. Browse the public{" "}
            <Link href="/talent" className="text-primary font-medium hover:underline">
              talent directory
            </Link>{" "}
            anytime.
          </p>
        </section>

        <p className="mt-10 text-secondary leading-relaxed">
          Ready?{" "}
          <Link href="/talent/login" className="font-semibold text-primary hover:underline">
            Create your free talent profile
          </Link>{" "}
          or{" "}
          <Link href="/careers" className="font-semibold text-primary hover:underline">
            browse open motor shop jobs
          </Link>
          .
        </p>
      </article>
    </BlogPageLayout>
  );
}
