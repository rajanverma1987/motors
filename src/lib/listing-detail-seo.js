/**
 * SEO helpers for public directory listing detail pages (JSON-LD, FAQ content).
 */

/** Readable labels for listing option keys (services, industries, etc.). */
export const LISTING_OPTION_LABELS = {
  acMotorRepair: "AC Motor Repair",
  dcMotorRepair: "DC Motor Repair",
  motorRewinding: "Motor Rewinding",
  pumpRepair: "Pump Repair",
  generatorRepair: "Generator Repair",
  servoMotorRepair: "Servo Motor Repair",
  spindleRepair: "Spindle Repair",
  vfdRepair: "VFD Repair",
  fieldService: "Field Service",
  emergencyRepair: "Emergency Repair (24/7)",
  onSiteTroubleshooting: "On-site Troubleshooting",
  lowVoltage: "Low Voltage",
  mediumVoltage: "Medium Voltage",
  highVoltage: "High Voltage",
  explosionProof: "Explosion Proof",
  hazardousLocation: "Hazardous Location",
  submersible: "Submersible",
  dynamometer: "Dynamometer",
  surge: "Surge Testing",
  vibration: "Vibration Analysis",
  balancing: "Balancing",
  laserAlignment: "Laser Alignment",
  infrared: "Infrared",
  loadTesting: "Load Testing",
  highVoltageTesting: "High Voltage Testing",
  acMotorRewinding: "AC Motor Rewinding",
  dcArmatureRewinding: "DC Armature Rewinding",
  fieldCoilRewinding: "Field Coil Rewinding",
  coilManufacturing: "Coil Manufacturing",
  vpi: "VPI",
  insulationUpgrades: "Insulation Upgrades",
  manufacturing: "Manufacturing",
  oilGas: "Oil & Gas",
  waterTreatment: "Water Treatment",
  powerPlants: "Power Plants",
  mining: "Mining",
  hvac: "HVAC",
  foodProcessing: "Food Processing",
  agriculture: "Agriculture",
  easaMember: "EASA Member",
  isoCertification: "ISO Certification",
  ulCertified: "UL Certified",
  factoryAuthorizedRepair: "Factory Authorized Repair",
  insuranceCoverage: "Insurance Coverage",
};

/** Industry listing keys → public vertical page paths. */
const INDUSTRY_PAGE_BY_LISTING_KEY = {
  manufacturing: "/electric-motor-repair-manufacturing",
  waterTreatment: "/electric-motor-repair-water-treatment",
  oilGas: "/electric-motor-repair-oil-gas",
  foodProcessing: "/electric-motor-repair-food-processing",
  mining: "/electric-motor-repair-mining",
};

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
 * @param {unknown} arr
 * @returns {string[]}
 */
export function formatListingOptionLabels(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr.map((item) => LISTING_OPTION_LABELS[item] || String(item));
}

/**
 * Title under ~60 chars: "Shop Name | City, ST | IQMotorBase"
 * @param {{ companyName?: string, city?: string, state?: string }} listing
 */
export function buildListingDetailTitle(listing) {
  const name = String(listing.companyName || "").trim() || "Motor repair shop";
  const city = String(listing.city || "").trim();
  const state = String(listing.state || "").trim();
  const place = [city, state].filter(Boolean).join(", ");
  const suffix = place ? ` | ${place} | IQMotorBase` : " | IQMotorBase";
  const maxName = Math.max(12, 58 - suffix.length);
  const shortName = name.length > maxName ? `${name.slice(0, maxName - 1).trim()}…` : name;
  return `${shortName}${suffix}`;
}

/**
 * Keyword H1 for listing detail.
 * @param {{ companyName?: string, city?: string, state?: string }} listing
 */
export function buildListingDetailH1(listing) {
  const name = String(listing.companyName || "").trim() || "Motor repair shop";
  const city = String(listing.city || "").trim();
  const state = String(listing.state || "").trim();
  if (city && state) return `${name} — Electric Motor Repair in ${city}, ${state}`;
  if (city) return `${name} — Electric Motor Repair in ${city}`;
  return `${name} — Electric Motor Repair`;
}

/**
 * Unique meta description under 160 chars.
 * @param {Record<string, unknown>} listing
 * @param {string[]} serviceLabels
 */
export function buildListingDetailDescription(listing, serviceLabels = []) {
  const name = String(listing.companyName || "").trim() || "This shop";
  const city = String(listing.city || "").trim();
  const state = String(listing.state || "").trim();
  const place = [city, state].filter(Boolean).join(", ");
  const servicesSummary = (serviceLabels || []).slice(0, 3).join(", ");
  const emergency =
    listing.rushRepairAvailable === true ||
    (Array.isArray(listing.services) && listing.services.includes("emergencyRepair"));
  const hp = String(listing.maxMotorSizeHP || "").trim();
  const parts = [
    place ? `${name} in ${place}.` : `${name}.`,
    servicesSummary || "",
    emergency ? "24/7 emergency repair." : "",
    hp ? `Up to ${hp} HP.` : "",
    "Get a quote on IQMotorBase.",
  ].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * @param {string} phone
 */
export function formatListingPhoneE164(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (String(phone || "").trim().startsWith("+")) return String(phone).trim();
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Whether listing offers emergency / 24x7 style repair.
 * @param {Record<string, unknown>} listing
 */
export function listingOffersEmergency(listing) {
  return (
    listing?.rushRepairAvailable === true ||
    (Array.isArray(listing?.services) && listing.services.includes("emergencyRepair"))
  );
}

/**
 * Industry items with optional vertical-page href.
 * @param {unknown} industriesServed
 * @returns {{ label: string, href?: string }[]}
 */
export function listingIndustryItems(industriesServed) {
  if (!Array.isArray(industriesServed)) return [];
  return industriesServed.map((key) => {
    const k = String(key || "");
    const label = LISTING_OPTION_LABELS[k] || k;
    const href = INDUSTRY_PAGE_BY_LISTING_KEY[k];
    return href ? { label, href } : { label };
  });
}

/**
 * Nearby city link targets from citiesOrMetrosServed text.
 * @param {Record<string, unknown>} listing
 * @returns {{ label: string, href: string }[]}
 */
export function listingNearbyCityLinks(listing) {
  const raw = String(listing.citiesOrMetrosServed || "").trim();
  if (!raw) return [];
  const city = String(listing.city || "").trim().toLowerCase();
  const state = String(listing.state || "").trim();
  const parts = raw
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const labelCity = part.replace(/\s+[A-Z]{2}$/i, "").trim() || part;
    const key = labelCity.toLowerCase();
    if (!key || key === city || seen.has(key)) continue;
    seen.add(key);
    const params = new URLSearchParams();
    params.set("city", labelCity);
    if (state) params.set("state", state);
    out.push({
      label: `Motor repair shops in ${labelCity}`,
      href: `/electric-motor-repair-shops-listings?${params.toString()}`,
    });
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * ISO date for freshness signals.
 * @param {Record<string, unknown>} listing
 */
export function listingModifiedIso(listing) {
  const raw = listing?.updatedAt || listing?.approvedAt || listing?.createdAt;
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * FAQ items for visible section and FAQPage JSON-LD (plain-text answers).
 * @param {Record<string, unknown>} listing
 * @param {{ locationLine: string, addressLine: string, servicesPreview: string, regionLine: string }} ctx
 * @param {string} siteBase canonical origin (no trailing slash)
 * @returns {{ question: string, answer: string }[]}
 */
export function buildListingDetailFaqs(listing, ctx, siteBase) {
  const base = String(siteBase || "https://IQMotorBase.com").replace(/\/$/, "");
  const name = String(listing.companyName || "This repair center").trim() || "This repair center";
  const items = [];
  const emergency = listingOffersEmergency(listing);
  const maxHp = String(listing.maxMotorSizeHP || "").trim();
  const maxVoltage = String(listing.maxVoltage || "").trim();

  if (ctx.addressLine) {
    items.push({
      question: `Where is ${name} located?`,
      answer: `${name} is located at ${ctx.addressLine}, United States.`,
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
      answer: `${name} offers: ${ctx.servicesPreview}. See the full profile on this page for testing capabilities, rewinding types, industries served, and certifications.`,
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
      answer: `Submit a repair request through the form on this IQMotorBase listing, or call ${String(listing.phone).trim()}.`,
    });
  } else {
    items.push({
      question: `How do I contact ${name}?`,
      answer: `Submit a repair request through the form on this IQMotorBase listing.`,
    });
  }

  if (emergency) {
    items.push({
      question: `Does ${name} offer emergency motor repair?`,
      answer: `Yes. ${name} offers emergency / rush motor repair service. For emergency repairs, submit a request through this listing or call directly.`,
    });
  }

  if (maxHp) {
    items.push({
      question: `What is the maximum motor size ${name} can repair?`,
      answer: `${name} handles motors up to ${maxHp} HP${maxVoltage ? ` and up to ${maxVoltage}` : ""}.`,
    });
  }

  items.push({
    question: "Is this electric motor repair listing verified?",
    answer:
      "Listings on IQMotorBase.com are submitted by repair shops and reviewed before publication. Always confirm credentials, insurance, and scope of work directly with the shop before awarding work.",
  });

  items.push({
    question: "How can my motor repair shop appear in this directory?",
    answer: `Motor repair and rewinding businesses can list their company on IQMotorBase.com to reach industrial and commercial customers. Submit your shop profile at ${base}/list-your-electric-motor-services.`,
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
 *   sameAreaHref?: string,
 *   sameAreaLabel?: string,
 * }} opts
 */
export function buildListingDetailJsonLdGraph(opts) {
  const {
    listing,
    canonicalUrl,
    siteBase,
    reviewStats,
    faqs,
    sameAreaHref = "",
    sameAreaLabel = "",
  } = opts;
  const name = String(listing.companyName || "").trim() || "Motor repair center";
  const description = String(listing.shortDescription || "").trim().slice(0, 5000);
  const images = listingImageAbsoluteUrls(listing, siteBase);
  const phoneRaw = String(listing.phone || "").trim();
  const phone = phoneRaw ? formatListingPhoneE164(phoneRaw) || phoneRaw : undefined;
  const email = String(listing.email || "").trim() || undefined;
  const website = String(listing.website || "").trim();
  const sameAs = /^https?:\/\//i.test(website) ? [website] : undefined;
  const modified = listingModifiedIso(listing);
  const emergency = listingOffersEmergency(listing);

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
          addressCountry: country === "United States" || country === "USA" ? "US" : country,
        }
      : undefined;

  const businessId = `${canonicalUrl}#localbusiness`;
  const webPageId = `${canonicalUrl}#webpage`;

  const aggregateRating =
    reviewStats.count > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(reviewStats.average).toFixed(1),
          reviewCount: reviewStats.count,
          bestRating: "5",
          worstRating: "1",
        }
      : undefined;

  const serviceLabels = formatListingOptionLabels(listing.services);
  const industryLabels = formatListingOptionLabels(listing.industriesServed);
  const statesServed = String(listing.statesServed || "")
    .split(/[,;/|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const localBusiness = {
    "@type": "LocalBusiness",
    "@id": businessId,
    name,
    ...(description ? { description } : {}),
    url: canonicalUrl,
    ...(images.length ? { image: images, logo: images[0] } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(address ? { address } : {}),
    ...(sameAs ? { sameAs } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
    priceRange: "$$",
    additionalType: "https://schema.org/ProfessionalService",
    ...(industryLabels.length ? { knowsAbout: industryLabels } : {}),
    ...(serviceLabels.length
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Motor Repair Services",
            itemListElement: serviceLabels.map((s) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: s },
            })),
          },
        }
      : {}),
    ...(statesServed.length
      ? {
          areaServed: statesServed.map((state) => ({
            "@type": "State",
            name: state,
          })),
        }
      : locality && region
        ? {
            areaServed: {
              "@type": "City",
              name: locality,
              containedInPlace: { "@type": "State", name: region },
            },
          }
        : {}),
    ...(emergency ? { openingHours: "Mo-Su 00:00-23:59" } : {}),
    ...(listing.yearsInBusiness && Number(listing.yearsInBusiness) > 0
      ? {
          foundingDate: String(new Date().getFullYear() - Number(listing.yearsInBusiness)),
        }
      : {}),
    dateModified: modified,
  };

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: siteBase,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Motor Repair Shops",
      item: `${siteBase}/electric-motor-repair-shops-listings`,
    },
  ];
  if (sameAreaHref && sameAreaLabel) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: sameAreaLabel,
      item: sameAreaHref.startsWith("http") ? sameAreaHref : `${siteBase}${sameAreaHref}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 4,
      name,
      item: canonicalUrl,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name,
      item: canonicalUrl,
    });
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  const webPage = {
    "@type": "WebPage",
    "@id": webPageId,
    url: canonicalUrl,
    name: buildListingDetailTitle(listing),
    ...(description ? { description: description.slice(0, 320) } : {}),
    dateModified: modified,
    isPartOf: {
      "@type": "WebSite",
      name: "IQMotorBase.com",
      url: siteBase,
    },
    publisher: {
      "@type": "Organization",
      name: "IQMotorBase.com",
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
