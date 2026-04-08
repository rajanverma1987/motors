/**
 * SEO helpers for public directory listing detail pages (JSON-LD, FAQ content).
 */

/**
 * @param {string} siteBase
 * @param {string} [url]
 */
export function listingAssetAbsoluteUrl(siteBase, url) {
  if (!url || typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  const base = String(siteBase || "").replace(/\/$/, "");
  const path = t.startsWith("/") ? t : `/${t}`;
  return `${base}${path}`;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {string} siteBase
 * @returns {string[]}
 */
export function listingImageAbsoluteUrls(listing, siteBase) {
  const out = [];
  const logo = String(listing.logoUrl || "").trim();
  if (logo) {
    const u = listingAssetAbsoluteUrl(siteBase, logo);
    if (u) out.push(u);
  }
  const gallery = Array.isArray(listing.galleryPhotoUrls) ? listing.galleryPhotoUrls : [];
  for (const raw of gallery) {
    if (out.length >= 10) break;
    const u = listingAssetAbsoluteUrl(siteBase, String(raw || "").trim());
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
}

/**
 * FAQ items for visible section and FAQPage JSON-LD (plain-text answers).
 * @param {Record<string, unknown>} listing
 * @param {{ locationLine: string, addressLine: string, servicesPreview: string, regionLine: string }} ctx
 * @param {string} siteBase canonical origin (no trailing slash), e.g. from getPublicSiteUrl()
 * @returns {{ question: string, answer: string }[]}
 */
export function buildListingDetailFaqs(listing, ctx, siteBase) {
  const base = String(siteBase || "https://motorswinding.com").replace(/\/$/, "");
  const name = String(listing.companyName || "This repair center").trim() || "This repair center";
  const items = [];

  if (ctx.addressLine) {
    items.push({
      question: `Where is ${name} located?`,
      answer: `${name} is located at ${ctx.addressLine}.`,
    });
  } else if (ctx.locationLine) {
    items.push({
      question: `Where is ${name} located?`,
      answer: `${name} is based in ${ctx.locationLine}. See the listing for full address and contact options.`,
    });
  }

  if (ctx.servicesPreview) {
    items.push({
      question: `What electric motor services does ${name} offer?`,
      answer: `${name} lists the following capabilities and services: ${ctx.servicesPreview}. See the full profile on this page for testing, rewinding, industries served, and certifications.`,
    });
  }

  if (ctx.regionLine) {
    items.push({
      question: `What areas does ${name} serve?`,
      answer: ctx.regionLine,
    });
  }

  if (listing.phone) {
    items.push({
      question: `How do I contact ${name}?`,
      answer: `You can request a quote or reach the shop through the contact options on this MotorsWinding.com listing. Phone on file: ${String(listing.phone).trim()}.`,
    });
  } else {
    items.push({
      question: `How do I contact ${name}?`,
      answer: `Use the "Contact / Request quote" button on this page to send your requirement through MotorsWinding.com. The shop receives your inquiry through our directory.`,
    });
  }

  items.push({
    question: "Is this electric motor repair listing verified?",
    answer:
      "Listings on MotorsWinding.com are submitted by repair centers and reviewed before publication. Always confirm credentials, insurance, and scope of work directly with the shop before awarding work.",
  });

  items.push({
    question: "How can my motor repair shop appear in this directory?",
    answer: `Motor repair and rewinding businesses can list their company on MotorsWinding.com to reach industrial and commercial customers. Submit your shop profile at ${base}/list-your-electric-motor-services.`,
  });

  return items;
}

/**
 * @param {{
 *   listing: Record<string, unknown>,
 *   canonicalUrl: string,
 *   siteBase: string,
 *   reviewStats: { average: number, count: number },
 *   faqs: { question: string, answer: string }[],
 * }} opts
 */
export function buildListingDetailJsonLdGraph(opts) {
  const { listing, canonicalUrl, siteBase, reviewStats, faqs } = opts;
  const name = String(listing.companyName || "").trim() || "Motor repair center";
  const description = String(listing.shortDescription || "").trim().slice(0, 5000);
  const images = listingImageAbsoluteUrls(listing, siteBase);
  const phone = String(listing.phone || "").trim() || undefined;
  const website = String(listing.website || "").trim();
  const sameAs = /^https?:\/\//i.test(website) ? [website] : undefined;

  const street = String(listing.address || "").trim();
  const locality = String(listing.city || "").trim();
  const region = String(listing.state || "").trim();
  const postal = String(listing.zipCode || "").trim();
  const country = String(listing.country || "United States").trim();

  const address =
    street || locality || region || postal
      ? {
          "@type": "PostalAddress",
          ...(street ? { streetAddress: street } : {}),
          ...(locality ? { addressLocality: locality } : {}),
          ...(region ? { addressRegion: region } : {}),
          ...(postal ? { postalCode: postal } : {}),
          addressCountry: country,
        }
      : undefined;

  const businessId = `${canonicalUrl}#localbusiness`;
  const webPageId = `${canonicalUrl}#webpage`;

  const aggregateRating =
    reviewStats.count > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: reviewStats.average,
          reviewCount: reviewStats.count,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const localBusiness = {
    "@type": "LocalBusiness",
    "@id": businessId,
    name,
    ...(description ? { description } : {}),
    url: canonicalUrl,
    ...(images.length ? { image: images } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(address ? { address } : {}),
    ...(sameAs ? { sameAs } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    priceRange: "Varies",
    /** Industrial / commercial motor repair — closest generic LocalBusiness use */
    additionalType: "https://schema.org/ProfessionalService",
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteBase,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Motor repair directory",
        item: `${siteBase}/electric-motor-reapir-shops-listings`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: canonicalUrl,
      },
    ],
  };

  const webPage = {
    "@type": "WebPage",
    "@id": webPageId,
    url: canonicalUrl,
    name: `${name} | Electric motor repair`,
    ...(description ? { description: description.slice(0, 320) } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: "MotorsWinding.com",
      url: siteBase,
    },
    publisher: {
      "@type": "Organization",
      name: "MotorsWinding.com",
      url: siteBase,
      logo: {
        "@type": "ImageObject",
        url: `${siteBase.replace(/\/$/, "")}/og-image.png`,
      },
    },
    mainEntity: { "@id": businessId },
    about: { "@id": businessId },
    inLanguage: "en-US",
  };

  const faqPage = {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [webPage, localBusiness, breadcrumb, faqPage],
  };
}
