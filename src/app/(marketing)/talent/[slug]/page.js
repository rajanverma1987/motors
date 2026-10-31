import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { serializeTalentProfile } from "@/lib/talent-serialize";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import Badge from "@/components/ui/badge";
import {
  TALENT_AVAILABILITY_LABELS,
  TALENT_EMPLOYMENT_TYPES,
  TALENT_EXPERIENCE_LEVELS,
} from "@/lib/talent-constants";
import {
  buildTalentPersonJsonLd,
  buildTalentProfileMetadata,
  buildTalentShareText,
  talentRoleLabel,
  talentSkillLabel,
} from "@/lib/talent-seo";
import TalentShareButtons from "@/components/talent/talent-share-buttons";

export const revalidate = 120;

function availabilityVariant(value) {
  if (value === "available_now") return "success";
  if (value === "open") return "primary";
  return "default";
}

export async function generateMetadata({ params }) {
  const p = typeof params?.then === "function" ? await params : params;
  const slug = String(p?.slug || "").trim();
  const base = getPublicSiteUrl();
  await connectDB();
  const doc = await JobSeekerProfile.findOne({
    slug,
    status: "active",
    emailVerifiedAt: { $ne: null },
  })
    .select("fullName headline city state availability skills bio slug")
    .lean();
  if (!doc) {
    return marketingPageMetadata({
      path: `/talent/${slug}`,
      title: "Talent profile",
      description: "Motor shop talent profile on 3PhaseFlow.",
    });
  }
  const profile = serializeTalentProfile(doc);
  return buildTalentProfileMetadata(profile, base);
}

export default async function TalentPublicProfilePage({ params }) {
  const p = typeof params?.then === "function" ? await params : params;
  const slug = String(p?.slug || "").trim();
  await connectDB();
  const doc = await JobSeekerProfile.findOne({
    slug,
    status: "active",
    emailVerifiedAt: { $ne: null },
  }).lean();
  if (!doc) notFound();

  const profile = serializeTalentProfile(doc);
  const baseUrl = getPublicSiteUrl();
  const canonical = `${baseUrl}/talent/${encodeURIComponent(profile.slug)}`;
  const empLabels = Object.fromEntries(TALENT_EMPLOYMENT_TYPES.map((o) => [o.value, o.label]));
  const levelLabels = Object.fromEntries(TALENT_EXPERIENCE_LEVELS.map((o) => [o.value, o.label]));

  return (
    <div className="mx-auto max-w-[52rem] px-4 py-12 sm:px-6">
      <Link href="/talent" className="text-sm text-secondary hover:text-primary">
        All talent
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">
            {profile.fullName || "Talent profile"}
          </h1>
          <Badge
            variant={availabilityVariant(profile.availability)}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {TALENT_AVAILABILITY_LABELS[profile.availability] || profile.availability}
          </Badge>
        </div>
        {profile.headline ? <p className="mt-3 text-lg text-secondary">{profile.headline}</p> : null}
        <p className="mt-3 text-sm text-secondary">
          {[profile.city, profile.state].filter(Boolean).join(", ") || "Location not listed"}
          {profile.preferredAreas?.length
            ? ` · Preferred areas: ${profile.preferredAreas.join(", ")}`
            : ""}
          {profile.willingToRelocate ? " · Willing to relocate" : ""}
        </p>
        <p className="mt-2 text-xs text-secondary">
          {levelLabels[profile.experienceLevel] || profile.experienceLevel}
          {Number.isFinite(Number(profile.yearsExperience))
            ? ` · ${profile.yearsExperience} years experience`
            : ""}
        </p>
      </header>

      {profile.bio ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-title">About</h2>
          <p className="mt-3 whitespace-pre-wrap text-secondary">{profile.bio}</p>
        </section>
      ) : null}

      {(profile.roles || []).length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-title">Roles</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.roles.map((r) => (
              <span
                key={r}
                className="rounded-full border border-border bg-card px-3 py-1 text-sm text-title"
              >
                {talentRoleLabel(r)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {(profile.skills || []).length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-title">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-card px-3 py-1 text-sm text-title"
              >
                {talentSkillLabel(s)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {(profile.employmentTypes || []).length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-title">Employment types</h2>
          <p className="mt-2 text-sm text-secondary">
            {(profile.employmentTypes || []).map((t) => empLabels[t] || t).join(", ")}
          </p>
        </section>
      ) : null}

      {profile.salaryExpectation ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-title">Salary expectation</h2>
          <p className="mt-2 text-sm text-secondary">{profile.salaryExpectation}</p>
        </section>
      ) : null}

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-title">Share this profile</h2>
        <p className="mt-1 text-sm text-secondary">
          Post on LinkedIn, Facebook, or X so shops and peers can find this talent page.
        </p>
        <div className="mt-4">
          <TalentShareButtons
            profileUrl={canonical}
            shareTitle={`${profile.fullName || "Talent"} | 3PhaseFlow Talent`}
            shareText={buildTalentShareText(profile)}
          />
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
        <Link
          href="/careers"
          className="inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Browse open jobs
        </Link>
        <Link
          href="/talent/login"
          className="inline-flex rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-title"
        >
          Create your free profile
        </Link>
        {profile.resumeUrl ? (
          <a
            href={profile.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary"
          >
            View resume
          </a>
        ) : null}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildTalentPersonJsonLd(profile, canonical)),
        }}
      />
    </div>
  );
}
