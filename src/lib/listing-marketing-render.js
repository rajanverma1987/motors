import { getPublicSiteUrl } from "@/lib/public-site-url";
import { buildListingMarketingUnsubscribeUrl } from "@/lib/listing-marketing-unsubscribe";

/**
 * @param {string} html
 * @param {{ name?: string, email?: string, companyName?: string, unsubscribeUrl?: string }} ctx
 */
export function renderListingMarketingHtml(html, ctx) {
  const name = String(ctx.name || "").trim();
  const email = String(ctx.email || "").trim();
  const company = String(ctx.companyName || "").trim();
  const unsubscribeUrl = String(ctx.unsubscribeUrl || "").trim();
  let out = String(html || "");
  out = out
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{email\}\}/g, email)
    .replace(/\{\{companyName\}\}/g, company)
    .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
    .replace(/\{\{#name\}\}([\s\S]*?)\{\{\/name\}\}/g, name ? "$1" : "");

  const baseUrl = getPublicSiteUrl();
  out = out
    .replace(/https:\/\/iqmotorbase\.com\//gi, `${baseUrl}/`)
    .replace(/(?:https?:\/\/)?(?:www\.)?motorswinding\.com\/?/gi, `${baseUrl}/`);

  if (unsubscribeUrl && !out.includes(unsubscribeUrl)) {
    out += `<p style="margin-top:2em;font-size:12px;color:#666">You received this because your business was contacted about listing on IQMotorBase. <a href="${unsubscribeUrl}">Unsubscribe</a> from these emails.</p>`;
  }
  return out;
}

/**
 * @param {string} subject
 * @param {{ name?: string, email?: string, companyName?: string }} ctx
 */
export function renderListingMarketingSubject(subject, ctx) {
  const name = String(ctx.name || "").trim();
  const email = String(ctx.email || "").trim();
  const company = String(ctx.companyName || "").trim();
  return String(subject || "")
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{email\}\}/g, email)
    .replace(/\{\{companyName\}\}/g, company)
    .trim();
}

export function listingMarketingContextFromListing(listing, request) {
  const email = String(listing?.email || "")
    .trim()
    .toLowerCase();
  return {
    name: String(listing?.primaryContactPerson || "").trim(),
    email,
    companyName: String(listing?.companyName || "").trim(),
    unsubscribeUrl: buildListingMarketingUnsubscribeUrl(email, request),
  };
}
