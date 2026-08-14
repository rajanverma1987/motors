import { getPublicSiteUrl } from "@/lib/public-site-url";

/**
 * Self-referencing canonical + matching og:url for public marketing pages.
 * Do not set a site-wide homepage canonical in the root layout — child routes inherit it.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} opts.path pathname starting with `/`, or `/` for home
 * @param {boolean} [opts.index=true]
 * @param {string[]} [opts.keywords]
 * @param {string} [opts.ogTitle]
 * @returns {import("next").Metadata}
 */
export function marketingPageMetadata({
  title,
  description,
  path,
  index = true,
  keywords,
  ogTitle,
}) {
  const base = getPublicSiteUrl().replace(/\/$/, "");
  const normalized = path === "/" || path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const canonical = normalized === "/" ? base : `${base}${normalized}`;
  const socialTitle = ogTitle || title;

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical },
    robots: { index, follow: true },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: "IQMotorBase.com",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
    },
  };
}
