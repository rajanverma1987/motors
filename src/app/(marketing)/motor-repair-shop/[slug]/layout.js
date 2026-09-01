import { notFound } from "next/navigation";
import { resolveLocationPage } from "./resolve-location-page";

/**
 * The 404 decision has to happen here, above the `loading.js` Suspense boundary.
 * Once that boundary flushes its shell the response status is already 200, so a
 * notFound() inside page.js renders 404 markup over an HTTP 200, a soft 404, which
 * is how unknown city slugs ended up crawled and reported instead of dropped.
 * The layout resolves before the shell is sent, so the status is still ours to set.
 */
export default async function MotorRepairShopLocationLayout({ children, params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const page = await resolveLocationPage(resolvedParams?.slug);
  if (!page) notFound();
  return children;
}
