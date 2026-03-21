import { notFound } from "next/navigation";
import SeoLeadLandingPage from "@/components/marketing/SeoLeadLandingPage";
import {
  SEO_USA_HUB_PATH,
  getCityBySlugs,
  getAllCityStaticParams,
  buildSeoLeadFaq,
  SEO_DEFAULT_BENEFITS,
} from "@/lib/seo-usa-config";
import { buildCityLeadCopy } from "@/lib/seo-usa-lead-copy";

export function generateStaticParams() {
  return getAllCityStaticParams();
}

export async function generateMetadata({ params }) {
  const { state: stateSlug, city: citySlug } = await params;
  const ctx = getCityBySlugs(stateSlug, citySlug);
  if (!ctx) return { title: "Not found" };
  const { state, city } = ctx;
  const path = `/usa/${state.slug}/${city.slug}/motor-repair-business-listing`;
  const title = `Motor Repair Business Listing in ${city.name}, ${state.name} | Free + CRM`;
  const description = `List your motor repair or rewinding business in ${city.name}, ${state.name}. Get more customers and manage jobs with our free system.`;
  return {
    title,
    description,
    keywords: [
      `motor repair ${city.name}`,
      `electric motor repair ${city.name} ${state.name}`,
      `motor rewinding ${city.name}`,
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

function linkSections(state, city) {
  const siblings = state.cities.filter((c) => c.slug !== city.slug);
  const statePath = `/usa/${state.slug}/motor-repair-business-listing`;
  return [
    {
      title: `More cities in ${state.name}`,
      links: siblings.map((c) => ({
        href: `/usa/${state.slug}/${c.slug}/motor-repair-business-listing`,
        label: `${c.name}`,
      })),
    },
    {
      title: "Up a level",
      links: [
        { href: statePath, label: `${state.name} — statewide` },
        { href: SEO_USA_HUB_PATH, label: "USA hub" },
      ],
    },
    {
      title: "Guides & CRM",
      links: [
        { href: "/blog/how-to-get-more-customers-for-motor-repair-shop", label: "Get more motor repair customers" },
        { href: "/motor-repair-shop-management-software", label: "Motor repair shop management software" },
        { href: "/track-motor-repair-jobs", label: "Track motor repair jobs" },
      ],
    },
  ];
}

export default async function CityMotorRepairBusinessListingPage({ params }) {
  const { state: stateSlug, city: citySlug } = await params;
  const ctx = getCityBySlugs(stateSlug, citySlug);
  if (!ctx) notFound();

  const { state, city } = ctx;
  const path = `/usa/${state.slug}/${city.slug}/motor-repair-business-listing`;
  const copy = buildCityLeadCopy(state, city);
  const label = `${city.name}, ${state.name}`;

  return (
    <SeoLeadLandingPage
      h1={`List Your Motor Repair Business in ${label} – Get More Customers`}
      canonicalPath={path}
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: SEO_USA_HUB_PATH, label: "USA" },
        { href: `/usa/${state.slug}/motor-repair-business-listing`, label: state.name },
        { href: path, label: city.name },
      ]}
      introParagraphs={copy.introParagraphs}
      problemTitle={copy.problemTitle}
      problemParagraphs={copy.problemParagraphs}
      solutionTitle={copy.solutionTitle}
      solutionParagraphs={copy.solutionParagraphs}
      benefits={SEO_DEFAULT_BENEFITS}
      faq={buildSeoLeadFaq(label)}
      linkSections={linkSections(state, city)}
      formSourcePath={path}
      defaultCity={city.name}
      defaultState={state.name}
      localityLabel={label}
    />
  );
}
