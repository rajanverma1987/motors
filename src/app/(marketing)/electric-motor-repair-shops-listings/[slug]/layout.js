import { notFound } from "next/navigation";
import { resolveListing } from "./resolve-listing";

/**
 * See the sibling motor-repair-shop layout: the 404 has to be decided above the
 * `loading.js` Suspense boundary or the response has already gone out as 200.
 * A removed listing must answer a real 404 so Google drops the URL instead of
 * logging it as excluded and re-crawling it.
 */
export default async function ListingDetailLayout({ children, params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const { listing, redirectToSlug } = await resolveListing(resolvedParams?.slug);
  if (!listing && !redirectToSlug) notFound();
  return children;
}
