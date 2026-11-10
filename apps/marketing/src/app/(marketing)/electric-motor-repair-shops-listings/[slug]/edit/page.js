import { notFound, redirect } from "next/navigation";
import { resolveListing } from "../resolve-listing";
import { getListingPublicPathSegment } from "@/lib/listing-slug";
import EditListingClient from "./edit-listing-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const { listing } = await resolveListing(resolvedParams?.slug);
  const name = String(listing?.companyName || "").trim() || "your listing";
  return {
    title: `Edit ${name}`,
    robots: { index: false, follow: false },
  };
}

export default async function EditListingPage({ params }) {
  const resolvedParams = typeof params?.then === "function" ? await params : params ?? {};
  const { listing, redirectToSlug } = await resolveListing(resolvedParams?.slug);
  if (redirectToSlug) {
    redirect(`/electric-motor-repair-shops-listings/${redirectToSlug}/edit`);
  }
  if (!listing) notFound();
  const canonicalSlug = getListingPublicPathSegment(listing);
  if (canonicalSlug && canonicalSlug !== resolvedParams?.slug) {
    redirect(`/electric-motor-repair-shops-listings/${canonicalSlug}/edit`);
  }
  return (
    <EditListingClient
      slug={canonicalSlug}
      companyName={String(listing.companyName || "").trim()}
    />
  );
}
