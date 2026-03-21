import SeoLeadLandingPage from "@/components/marketing/SeoLeadLandingPage";
import {
  SEO_USA_HUB_PATH,
  SEO_USA_STATES,
  buildSeoLeadFaq,
  SEO_USA_HUB_BENEFIT_GROUPS,
} from "@/lib/seo-usa-config";
import { buildUsaLeadCopy } from "@/lib/seo-usa-lead-copy";

const path = SEO_USA_HUB_PATH;

export const metadata = {
  title: "Motor Repair Business Listing in the USA | Free + CRM",
  description:
    "List your motor repair or rewinding business in the United States. Get more customers and manage jobs with our free system built for motor shops—not a passive directory.",
  keywords: [
    "motor repair business listing USA",
    "electric motor repair leads",
    "motor rewinding shop CRM",
    "industrial motor repair marketing",
    "motor shop job management",
  ],
  openGraph: {
    title: "Motor Repair Business Listing in the USA | MotorsWinding.com",
    description:
      "Get more repair jobs and manage your workshop. List your motor shop and run quotes, jobs, and billing in one place.",
    url: path,
    type: "website",
    siteName: "MotorsWinding.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Motor Repair Business Listing in the USA | MotorsWinding.com",
    description: "More leads + motor-repair-focused CRM for shops across the United States.",
  },
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

function linkSections() {
  return [
    {
      title: "Browse by state",
      links: SEO_USA_STATES.map((s) => ({
        href: `/usa/${s.slug}/motor-repair-business-listing`,
        label: `${s.name} — list your motor repair business`,
      })),
    },
    {
      title: "Guides for shop owners",
      links: [
        {
          href: "/blog/how-to-get-more-customers-for-motor-repair-shop",
          label: "How to get more customers for a motor repair shop",
        },
        {
          href: "/blog/motor-rewinding-business-marketing-usa",
          label: "Motor rewinding business marketing in the USA",
        },
        {
          href: "/blog/best-software-for-repair-shop-2026",
          label: "Best software for a repair shop (2026)",
        },
        {
          href: "/blog/how-to-manage-repair-jobs-efficiently",
          label: "How to manage repair jobs efficiently",
        },
        { href: "/how-motor-repair-shops-get-more-customers", label: "Motor repair shop lead generation" },
      ],
    },
    {
      title: "Product & workflow",
      links: [
        { href: "/motor-repair-shop-management-software", label: "Motor repair shop management software" },
        { href: "/job-card-system-for-repair-shop", label: "Job card system for repair shops" },
        { href: "/track-motor-repair-jobs", label: "Track motor repair jobs" },
        { href: "/features", label: "CRM features overview" },
        { href: "/pricing", label: "Pricing" },
      ],
    },
  ];
}

export default function UsaMotorRepairBusinessListingPage() {
  const copy = buildUsaLeadCopy();
  return (
    <SeoLeadLandingPage
      h1="List Your Motor Repair Business in the USA – Get More Customers"
      canonicalPath={path}
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: path, label: "USA listings" },
      ]}
      introParagraphs={copy.introParagraphs}
      problemTitle={copy.problemTitle}
      problemParagraphs={copy.problemParagraphs}
      solutionTitle={copy.solutionTitle}
      solutionParagraphs={copy.solutionParagraphs}
      benefitGroups={SEO_USA_HUB_BENEFIT_GROUPS}
      faq={buildSeoLeadFaq("the United States")}
      linkSections={linkSections()}
      formSourcePath={path}
      localityLabel="United States"
    />
  );
}
