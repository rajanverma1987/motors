import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicJobPostingBySlug, getPublicJobPostingSlugs } from "@/lib/job-postings-public";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { EMPLOYMENT_LABELS, EXPERIENCE_LABELS } from "@/lib/job-posting-labels";
import { buildCareerMetaDescription, buildJobPostingJsonLd } from "@/lib/career-job-seo";
import CareerApplyForm from "./career-apply-form";

/** ISR: refresh cached job pages so new listings and edits appear without redeploy */
export const revalidate = 300;

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getPublicJobPostingSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolved?.slug;
  const job = await getPublicJobPostingBySlug(slug);
  const base = getPublicSiteUrl();
  if (!job) {
    return {
      title: "Job not found",
      robots: { index: false, follow: true },
    };
  }
  const path = `/careers/${job.slug}`;
  const canonicalUrl = `${base}${path}`;
  const description = buildCareerMetaDescription(job);
  const title = `${job.title} — ${job.shopName}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title: `${job.title} | Careers`,
      description,
      url: canonicalUrl,
      siteName: "MotorsWinding.com",
      locale: "en_US",
      type: "article",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${job.title} — ${job.shopName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${job.title} | MotorsWinding.com`,
      description,
      images: [`${base}/og-image.png`],
    },
  };
}

export default async function CareerDetailPage({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params ?? {};
  const slug = resolved?.slug;
  const job = await getPublicJobPostingBySlug(slug);
  if (!job) notFound();

  const baseUrl = getPublicSiteUrl();
  const canonicalUrl = `${baseUrl}/careers/${job.slug}`;
  const jobPostingJsonLd = buildJobPostingJsonLd(job, canonicalUrl);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Careers",
        item: `${baseUrl}/careers`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: job.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/careers" className="text-sm text-secondary hover:text-primary">
        ← All careers
      </Link>

      <div className="mt-6 space-y-12">
        <div className="min-w-0">
          <header className="border-b border-border pb-8">
            <div className="space-y-1">
              <p className="text-base font-semibold text-title">{job.shopName}</p>
              {(job.companyContactName || job.companyLocation) && (
                <p className="text-sm text-secondary">
                  {job.companyContactName ? (
                    <>
                      <span className="text-title/90">Contact:</span> {job.companyContactName}
                    </>
                  ) : null}
                  {job.companyContactName && job.companyLocation ? " · " : null}
                  {job.companyLocation ? <span>{job.companyLocation}</span> : null}
                </p>
              )}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">{job.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-secondary">
              {job.location ? (
                <span>
                  <span className="font-medium text-title/90">Role location:</span> {job.location}
                </span>
              ) : null}
              {job.location && job.department ? <span aria-hidden>·</span> : null}
              {job.department ? <span>{job.department}</span> : null}
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                {EMPLOYMENT_LABELS[job.employmentType] || job.employmentType}
              </span>
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs">
                {EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel}
              </span>
              {job.salaryDisplay ? (
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs">{job.salaryDisplay}</span>
              ) : null}
            </div>
          </header>

          <article className="prose prose-neutral dark:prose-invert mt-0 max-w-none">
            {job.description ? (
              <section className="mt-8">
                <h2 className="text-xl font-semibold text-title">About the role</h2>
                <div className="mt-3 whitespace-pre-wrap text-secondary leading-relaxed">{job.description}</div>
              </section>
            ) : null}

            {job.responsibilities ? (
              <section className="mt-8">
                <h2 className="text-xl font-semibold text-title">Responsibilities</h2>
                <div className="mt-3 whitespace-pre-wrap text-secondary leading-relaxed">{job.responsibilities}</div>
              </section>
            ) : null}

            {job.qualifications ? (
              <section className="mt-8">
                <h2 className="text-xl font-semibold text-title">Qualifications</h2>
                <div className="mt-3 whitespace-pre-wrap text-secondary leading-relaxed">{job.qualifications}</div>
              </section>
            ) : null}

            {job.benefits ? (
              <section className="mt-8">
                <h2 className="text-xl font-semibold text-title">Benefits</h2>
                <div className="mt-3 whitespace-pre-wrap text-secondary leading-relaxed">{job.benefits}</div>
              </section>
            ) : null}
          </article>
        </div>

        <section
          aria-labelledby="apply-heading"
          className="w-full rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10"
        >
          <CareerApplyForm slug={job.slug} headingId="apply-heading" />
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
