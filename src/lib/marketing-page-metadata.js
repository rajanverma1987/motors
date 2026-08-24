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
 * @param {boolean} [opts.follow] defaults to true; set false with index:false for login/register
 * @param {string[]} [opts.keywords]
 * @param {string} [opts.ogTitle]
 * @param {string} [opts.ogDescription]
 * @returns {import("next").Metadata}
 */
export function marketingPageMetadata({
  title,
  description,
  path,
  index = true,
  follow,
  keywords,
  ogTitle,
  ogDescription,
}) {
  const base = getPublicSiteUrl().replace(/\/$/, "");
  const normalized = path === "/" || path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  const canonical = normalized === "/" ? base : `${base}${normalized}`;
  const socialTitle = ogTitle || title;
  const socialDescription = ogDescription || description;
  const allowFollow = follow == null ? true : !!follow;

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical },
    robots: { index, follow: allowFollow },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url: canonical,
      siteName: "IQMotorBase.com",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
    },
  };
}
