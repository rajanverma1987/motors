import { notFound } from "next/navigation";
import SeoLeadLandingPage from "@/components/marketing/SeoLeadLandingPage";

/** Pre-render all state paths from generateStaticParams; server-rendered HTML (RSC). */
export const dynamic = "force-static";
import {
  SEO_USA_HUB_PATH,
  SEO_USA_STATES,
  getStateBySlug,
  getAllStateStaticParams,
  buildSeoLeadFaq,
  SEO_DEFAULT_BENEFITS,
} from "@/lib/seo-usa-config";
import { buildStateLeadCopy } from "@/lib/seo-usa-lead-copy";

export function generateStaticParams() {
  return getAllStateStaticParams();
}

export async function generateMetadata({ params }) {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return { title: "Not found" };
  const path = `/usa/${state.slug}/motor-repair-business-listing`;
  const title = `Motor Repair Business Listing in ${state.name} | Free + CRM`;
  const description = `List your motor repair or rewinding business in ${state.name}. Get more customers and manage jobs with our free system.`;
  return {
    title,
    description,
    keywords: [
      `motor repair business listing ${state.name}`,
      `electric motor repair ${state.name}`,
      `motor rewinding shop ${state.name}`,
      "motor repair CRM",
    ],
    openGraph: {
      title: `${title} | MotorsWinding.com`,
      description,
      url: path,
      type: "website",
      siteName: "MotorsWinding.com",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | MotorsWinding.com`,
      description,
    },
    alternates: { canonical: path },
    robots: { index: true, follow: true },
  };
}

function linkSections(state) {
  const others = SEO_USA_STATES.filter((s) => s.slug !== state.slug).slice(0, 8);
  return [
    {
      title: `Cities in ${state.name}`,
      links: state.cities.map((c) => ({
        href: `/usa/${state.slug}/${c.slug}/motor-repair-business-listing`,
        label: `${c.name} — motor repair business listing`,
      })),
    },
    {
      title: "USA hub",
      links: [
        { href: SEO_USA_HUB_PATH, label: "United States — motor repair business listing" },
        { href: "/register", label: "Create free CRM account" },
        { href: "/list-your-electric-motor-services", label: "Submit your directory profile" },
      ],
    },
    {
      title: "Other states",
      links: others.map((s) => ({
        href: `/usa/${s.slug}/motor-repair-business-listing`,
        label: `${s.name}`,
      })),
    },
    {
      title: "Guides",
      links: [
        { href: "/blog/how-to-get-more-customers-for-motor-repair-shop", label: "How to get more customers" },
        { href: "/usa/motor-repair-business-listing", label: "USA motor repair listing hub" },
      ],
    },
  ];
}

export default async function StateMotorRepairBusinessListingPage({ params }) {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) notFound();

  const path = `/usa/${state.slug}/motor-repair-business-listing`;
  const copy = buildStateLeadCopy(state);

  return (
    <SeoLeadLandingPage
      h1={`List Your Motor Repair Business in ${state.name} – Get More Customers`}
      canonicalPath={path}
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: SEO_USA_HUB_PATH, label: "USA" },
        { href: path, label: state.name },
      ]}
      introParagraphs={copy.introParagraphs}
      problemTitle={copy.problemTitle}
      problemParagraphs={copy.problemParagraphs}
      solutionTitle={copy.solutionTitle}
      solutionParagraphs={copy.solutionParagraphs}
      benefits={SEO_DEFAULT_BENEFITS}
      faq={buildSeoLeadFaq(state.name)}
      linkSections={linkSections(state)}
      formSourcePath={path}
      localityLabel={state.name}
    />
  );
}
