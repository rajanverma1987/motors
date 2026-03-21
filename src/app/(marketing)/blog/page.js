import Link from "next/link";
import HeroBackground from "@/components/marketing/HeroBackground";
import { SEO_USA_HUB_PATH } from "@/lib/seo-usa-config";

const path = "/blog";

export const metadata = {
  title: "Motor Repair Shop Marketing & Operations Blog",
  description:
    "Guides for electric motor repair and rewinding shop owners: more customers, better job tracking, and software that fits the workshop.",
  alternates: { canonical: path },
  robots: { index: true, follow: true },
};

const POSTS = [
  {
    href: "/blog/how-to-get-more-customers-for-motor-repair-shop",
    title: "How to get more customers for a motor repair shop",
    excerpt: "Directory presence, response speed, and proof of capability—what actually moves the needle.",
  },
  {
    href: "/blog/motor-rewinding-business-marketing-usa",
    title: "Motor rewinding business marketing in the USA",
    excerpt: "Positioning, service radius, and how buyers compare shops in industrial corridors.",
  },
  {
    href: "/blog/best-software-for-repair-shop-2026",
    title: "Best software for a repair shop in 2026",
    excerpt: "What to demand from quotes, job cards, inventory, and billing before you migrate.",
  },
  {
    href: "/blog/how-to-manage-repair-jobs-efficiently",
    title: "How to manage repair jobs efficiently",
    excerpt: "Statuses, handoffs, and fewer status calls—without hiring a full-time coordinator.",
  },
];

export default function BlogIndexPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-card py-12 sm:py-16">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <Link href="/" className="text-sm text-secondary hover:text-primary">
            ← Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-title sm:text-4xl">Blog for motor repair shop owners</h1>
          <p className="mt-4 text-lg text-secondary">
            Practical articles on leads, marketing, and operations—aligned with our{" "}
            <Link href={SEO_USA_HUB_PATH} className="text-primary font-medium hover:underline">
              USA motor repair business listing hub
            </Link>
            .
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ul className="space-y-8">
          {POSTS.map((p) => (
            <li key={p.href} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <Link href={p.href} className="text-xl font-semibold text-title hover:text-primary">
                {p.title}
              </Link>
              <p className="mt-2 text-secondary">{p.excerpt}</p>
              <Link href={p.href} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                Read article →
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-12 rounded-xl border border-dashed border-border p-6">
          <p className="font-medium text-title">Also explore</p>
          <ul className="mt-3 space-y-2 text-sm text-secondary">
            <li>
              <Link href="/motor-repair-shop-management-software" className="text-primary hover:underline">
                Motor repair shop management software
              </Link>
            </li>
            <li>
              <Link href="/track-motor-repair-jobs" className="text-primary hover:underline">
                Track motor repair jobs
              </Link>
            </li>
            <li>
              <Link href="/list-your-electric-motor-services" className="text-primary hover:underline">
                List your electric motor services
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
