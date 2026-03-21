import Link from "next/link";
import { getPublicJobPostings } from "@/lib/job-postings-public";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { EMPLOYMENT_LABELS, EXPERIENCE_LABELS } from "@/lib/job-posting-labels";

export const revalidate = 300;

export const metadata = {
  title: "Careers — Motor repair & rewinding jobs",
  description:
    "Open roles at motor repair and rewinding shops using MotorsWinding.com. Apply online with your experience.",
  alternates: { canonical: "/careers" },
  openGraph: {
    title: "Careers | MotorsWinding.com",
    description: "Find technician, winder, and shop roles at qualified motor repair centers.",
    url: "/careers",
    type: "website",
  },
};

export default async function CareersPage() {
  const jobs = await getPublicJobPostings();
  const baseUrl = getPublicSiteUrl();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="border-b border-border pb-8">
        <h1 className="text-3xl font-bold tracking-tight text-title sm:text-4xl">Careers</h1>
        <p className="mt-3 text-lg text-secondary">
          Open positions posted by motor repair and rewinding shops on MotorsWinding.com. Select a role to read details
          and apply with your contact information and experience.
        </p>
      </div>

      <ul className="mt-10 divide-y divide-border rounded-xl border border-border bg-card">
        {jobs.length === 0 ? (
          <li className="px-6 py-12 text-center text-secondary">
            No open roles listed right now. Check back soon, or{" "}
            <Link href="/list-your-electric-motor-services" className="text-primary font-medium hover:underline">
              list your shop
            </Link>{" "}
            to hire through the CRM.
          </li>
        ) : (
          jobs.map((job) => (
            <li
              key={job.id}
              className="transition-colors hover:bg-muted/30 focus-within:bg-muted/30"
            >
              <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <Link
                  href={`/careers/${job.slug}`}
                  className="group min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <h2 className="text-lg font-semibold text-title transition-colors group-hover:text-primary">{job.title}</h2>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <p className="font-medium text-title">{job.shopName}</p>
                    {(job.companyContactName || job.companyLocation) && (
                      <p className="text-secondary">
                        {job.companyContactName ? (
                          <span>
                            <span className="text-title/80">Contact:</span> {job.companyContactName}
                          </span>
                        ) : null}
                        {job.companyContactName && job.companyLocation ? (
                          <span className="text-secondary"> · </span>
                        ) : null}
                        {job.companyLocation ? <span>{job.companyLocation}</span> : null}
                      </p>
                    )}
                    {job.location ? (
                      <p className="text-xs text-secondary">
                        <span className="font-medium text-title/90">Role location:</span> {job.location}
                      </p>
                    ) : null}
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col gap-3 sm:items-end">
                  <div className="flex flex-wrap gap-2 text-xs text-secondary sm:justify-end">
                    <span className="rounded-full border border-border bg-bg px-2 py-1">
                      {EMPLOYMENT_LABELS[job.employmentType] || job.employmentType}
                    </span>
                    <span className="rounded-full border border-border bg-bg px-2 py-1">
                      {EXPERIENCE_LABELS[job.experienceLevel] || job.experienceLevel}
                    </span>
                    {job.salaryDisplay ? (
                      <span className="rounded-full border border-border bg-bg px-2 py-1">{job.salaryDisplay}</span>
                    ) : null}
                  </div>
                  <Link
                    href={`/careers/${job.slug}`}
                    className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[10.5rem]"
                  >
                    View &amp; apply
                  </Link>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Careers at motor repair shops",
            numberOfItems: jobs.length,
            itemListElement: jobs.map((job, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${baseUrl}/careers/${job.slug}`,
              name: job.title,
            })),
          }),
        }}
      />
    </div>
  );
}
