import Link from "next/link";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { serializeTalentProfile } from "@/lib/talent-serialize";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { TALENT_SKILLS } from "@/lib/talent-constants";
import TalentDirectoryClient from "@/components/talent/talent-directory-client";

export const revalidate = 120;

export const metadata = marketingPageMetadata({
  path: "/talent",
  title: "Motor Shop Talent Directory | Hire Technicians & Winders",
  description:
    "Browse free public profiles of motor rewind technicians, machinists, and field techs. Shops hire on IQMotorBase Careers. Create your free profile today.",
});

export default async function TalentDirectoryPage() {
  await connectDB();
  const docs = await JobSeekerProfile.find({
    status: "active",
    emailVerifiedAt: { $ne: null },
    fullName: { $exists: true, $nin: [null, ""] },
  })
    .sort({ profileScore: -1, updatedAt: -1 })
    .limit(120)
    .lean();

  const rows = docs.map((d) => serializeTalentProfile(d));
  const baseUrl = getPublicSiteUrl();

  return (
    <div className="relative">
      <section className="border-b border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-bg to-bg">
        <div className="mx-auto max-w-[67.2rem] px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">IQMotorBase Talent</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-title sm:text-5xl">
            Motor shop professionals, ready to hire
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-secondary">
            Free public profiles for winders, technicians, and shop talent. Create yours with email OTP, get
            location-matched job alerts, and apply to roles on{" "}
            <Link href="/careers" className="font-medium text-primary hover:underline">
              Careers
            </Link>
            .
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/talent/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Create free profile
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-title hover:bg-muted/40"
            >
              Browse open jobs
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[67.2rem] px-4 py-10 sm:px-6">
        <TalentDirectoryClient initialRows={rows} skillOptions={TALENT_SKILLS} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: "Motor shop talent directory",
              url: `${baseUrl}/talent`,
              description:
                "Public profiles of motor repair technicians and winders seeking shop roles.",
            }),
          }}
        />
      </div>
    </div>
  );
}
