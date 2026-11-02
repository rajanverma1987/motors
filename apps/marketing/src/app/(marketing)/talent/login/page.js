import Link from "next/link";
import {
  FiBell,
  FiBriefcase,
  FiCheckCircle,
  FiLock,
  FiMail,
  FiMapPin,
  FiUser,
} from "react-icons/fi";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import TalentOtpLoginForm from "@/components/talent/talent-otp-login-form";

export const metadata = marketingPageMetadata({
  path: "/talent/login",
  title: "Create free talent profile | Motor shop job seekers",
  description:
    "Free electric motor shop talent profile: email OTP sign-in, public directory listing, location-matched job alerts, and apply to Careers with your profile. No password.",
});

const BENEFITS = [
  {
    icon: FiUser,
    title: "Free public profile",
    body: "Show skills, experience, and availability to motor repair shops hiring on 3PhaseFlow.",
  },
  {
    icon: FiBell,
    title: "Location-matched job alerts",
    body: "Get an email when a new Careers role matches your preferred states or areas.",
  },
  {
    icon: FiBriefcase,
    title: "Apply with your profile",
    body: "One-tap apply on open jobs. Shops see your real profile, not a guest form.",
  },
  {
    icon: FiMapPin,
    title: "Found in the talent directory",
    body: "Shops browse winders, technicians, and field talent by skill and location.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Enter your email",
    body: "We send a 6-digit code. No password to create or remember.",
  },
  {
    n: "2",
    title: "Verify and open your profile",
    body: "Add name, skills, preferred areas, availability, and optional resume.",
  },
  {
    n: "3",
    title: "Get alerts and apply",
    body: "Turn on job alerts, appear in Talent, and apply from Careers when ready.",
  },
];

function safeNextPath(raw) {
  if (typeof raw !== "string") return "/talent/profile";
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/talent/profile";
  return path;
}

export default async function TalentLoginPage({ searchParams }) {
  const sp = typeof searchParams?.then === "function" ? await searchParams : searchParams || {};
  const redirectTo = safeNextPath(sp.next);

  return (
    <div className="relative">
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-bg to-bg">
        <div className="mx-auto max-w-[67.2rem] px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/talent"
            className="inline-flex text-sm font-medium text-secondary transition-colors hover:text-primary"
          >
            ← Back to talent directory
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
            <div className="lg:col-span-7">
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                For job seekers
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-title sm:text-4xl">
                Create your free electric motor shop talent profile
              </h1>
              <p className="mt-4 max-w-xl text-lg text-secondary">
                Built for winders, technicians, machinists, and field service pros. Sign in with email,
                build a public profile shops can trust, and get matched to open roles.
              </p>

              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {BENEFITS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.title}
                      className="rounded-xl border border-border/80 bg-card/70 p-4 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        </span>
                        <div>
                          <h2 className="text-sm font-semibold text-title">{item.title}</h2>
                          <p className="mt-1 text-sm leading-relaxed text-secondary">{item.body}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-10">
                <h2 className="text-lg font-semibold text-title">How it works</h2>
                <ol className="mt-4 space-y-4">
                  {STEPS.map((step) => (
                    <li key={step.n} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {step.n}
                      </span>
                      <div>
                        <p className="font-medium text-title">{step.title}</p>
                        <p className="mt-0.5 text-sm text-secondary">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <ul className="mt-8 space-y-2 text-sm text-secondary">
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>Always free for job seekers. No credit card.</span>
                </li>
                <li className="flex items-start gap-2">
                  <FiLock className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>OTP only. We never store a password for talent accounts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <FiMail className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>
                    You can mark yourself &quot;Not available for hire&quot; anytime and turn alerts off.
                  </span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <TalentOtpLoginForm
                  redirectTo={redirectTo}
                  title="Sign in or create your profile"
                  subtitle="Enter your work or personal email. We send a 6-digit code. Returning users land on the same profile to edit."
                />
                <p className="mt-6 border-t border-border pt-4 text-center text-sm text-secondary">
                  Looking for shop jobs?{" "}
                  <Link href="/careers" className="font-medium text-primary hover:underline">
                    Browse careers
                  </Link>
                </p>
              </div>
              <p className="mt-4 text-center text-xs text-secondary">
                By continuing you agree to our{" "}
                <Link href="/terms" className="underline hover:text-primary">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-primary">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[67.2rem] px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-6 sm:px-8 sm:py-8">
          <h2 className="text-lg font-semibold text-title">Tips before you start</h2>
          <ul className="mt-4 grid gap-3 text-sm text-secondary sm:grid-cols-2">
            <li className="flex gap-2">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              Use an email you check often. Job alerts and apply confirmations go there.
            </li>
            <li className="flex gap-2">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              Have your preferred states and top skills ready (rewind, VFD, machining, field service).
            </li>
            <li className="flex gap-2">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              A PDF resume helps shops review you faster after you apply.
            </li>
            <li className="flex gap-2">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              Already signed in before? Same email + new code brings you back to edit your profile.
            </li>
          </ul>
          <p className="mt-5 text-sm text-secondary">
            More detail:{" "}
            <Link
              href="/blog/create-free-electric-motor-shop-technician-profile"
              className="font-medium text-primary hover:underline"
            >
              Create a free electric motor shop technician profile
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
