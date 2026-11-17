/**
 * Edge-safe bot filtering for listing data paths.
 *
 * Scope is deliberately narrow: this guards the directory's listing data, not the whole
 * site. Blanket user-agent blocking breaks more than it fixes, and the site WANTS to be
 * crawled — organic directory traffic is where nearly all the search demand is, and AI
 * search crawlers are a visibility channel we are trying to grow. So:
 *
 *   - Search and AI crawlers are allowed through first, before any deny check.
 *   - Commercial SEO / data-harvesting crawlers are blocked: they take the listing data
 *     and send no visitors back.
 *   - Scripted clients with no browser identity are blocked on listing data paths only,
 *     so curl against the rest of the site (health checks, our own monitoring) still works.
 */

/** Crawlers we want: search engines, and the AI answer engines we want to be cited by. */
const ALLOWED_CRAWLERS = [
  "googlebot",
  "google-inspectiontool",
  "storebot-google",
  "bingbot",
  "bingpreview",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "applebot",
  "oai-searchbot",
  "chatgpt-user",
  "gptbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "perplexitybot",
  "perplexity-user",
  "google-extended",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "whatsapp",
  "telegrambot",
];

/** Commercial crawlers that harvest directory data and return no traffic. */
const BLOCKED_CRAWLERS = [
  "ahrefsbot",
  "semrushbot",
  "dotbot",
  "rogerbot",
  "mj12bot",
  "majestic",
  "blexbot",
  "dataforseobot",
  "serpstatbot",
  "zoominfobot",
  "petalbot",
  "seekportbot",
  "megaindex",
  "linkdexbot",
  "sistrix",
  "barkrowler",
  "webmeup",
  "netcraftsurveyagent",
  "scrapy",
  "httrack",
  "wget",
  "libwww-perl",
  "nutch",
  "zgrab",
  "masscan",
];

/** Scripted HTTP clients: blocked on listing data paths only (see isListingDataPath). */
const SCRIPTED_CLIENTS = [
  "python-requests",
  "python-urllib",
  "aiohttp",
  "httpx",
  "go-http-client",
  "java/",
  "okhttp",
  "apache-httpclient",
  "node-fetch",
  "axios/",
  "guzzle",
  "restsharp",
  "curl/",
  "powershell",
  "php/",
];

/** True for the directory data a scraper would be after. */
export function isListingDataPath(pathname) {
  const p = String(pathname || "");
  return (
    p.startsWith("/api/listings") ||
    p.startsWith("/electric-motor-repair-shops-listings") ||
    p.startsWith("/motor-repair-shop/") ||
    p.startsWith("/electric-motor-repair-near-me")
  );
}

function matchesAny(ua, list) {
  return list.some((needle) => ua.includes(needle));
}

/**
 * Decide whether to serve a request.
 *
 * @param {string} userAgent Raw user-agent header.
 * @param {string} pathname Request path.
 * @returns {{ blocked: boolean, reason: string }}
 */
export function evaluateBotRequest(userAgent, pathname) {
  const ua = String(userAgent || "").toLowerCase().trim();

  // Wanted crawlers win over every deny rule below.
  if (ua && matchesAny(ua, ALLOWED_CRAWLERS)) return { blocked: false, reason: "" };

  if (ua && matchesAny(ua, BLOCKED_CRAWLERS)) {
    return { blocked: true, reason: "crawler" };
  }

  // Everything below applies only where the listing data lives.
  if (!isListingDataPath(pathname)) return { blocked: false, reason: "" };

  if (!ua) return { blocked: true, reason: "no-user-agent" };
  if (matchesAny(ua, SCRIPTED_CLIENTS)) return { blocked: true, reason: "scripted-client" };

  return { blocked: false, reason: "" };
}

/** Per-IP ceiling for listing data paths — tighter than the sitewide flood limit. */
export const LISTING_PATH_FLOOD_LIMIT = 90;
