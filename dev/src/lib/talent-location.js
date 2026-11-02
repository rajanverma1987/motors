import { US_STATE_CODES } from "@/lib/talent-constants";

const STATE_NAME_TO_CODE = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

/**
 * Extract US state codes mentioned in a free-text job location.
 * @param {string} locationText
 * @returns {string[]}
 */
export function extractStateCodesFromLocation(locationText) {
  const text = String(locationText || "").trim();
  if (!text) return [];
  const found = new Set();
  const upper = text.toUpperCase();
  for (const code of US_STATE_CODES) {
    const re = new RegExp(`(^|[^A-Z])${code}([^A-Z]|$)`);
    if (re.test(upper)) found.add(code);
  }
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (lower.includes(name)) found.add(code);
  }
  return [...found];
}

/**
 * Whether a seeker should receive an alert for a job location.
 * @param {{ state?: string, preferredAreas?: string[], willingToRelocate?: boolean }} seeker
 * @param {string} jobLocation
 */
export function seekerMatchesJobLocation(seeker, jobLocation) {
  const jobStates = extractStateCodesFromLocation(jobLocation);
  const seekerState = String(seeker?.state || "")
    .trim()
    .toUpperCase();
  const preferred = (Array.isArray(seeker?.preferredAreas) ? seeker.preferredAreas : [])
    .map((s) => String(s || "").trim().toUpperCase())
    .filter(Boolean);

  if (jobStates.length === 0) {
    // No parseable state on job: match seekers who listed the raw location substring, or national relocate.
    const loc = String(jobLocation || "").toLowerCase();
    if (!loc) return Boolean(seeker?.willingToRelocate);
    if (seekerState && loc.includes(seekerState.toLowerCase())) return true;
    if (preferred.some((p) => loc.includes(p.toLowerCase()))) return true;
    return Boolean(seeker?.willingToRelocate);
  }

  if (seekerState && jobStates.includes(seekerState)) return true;
  if (preferred.some((p) => jobStates.includes(p))) return true;
  if (seeker?.willingToRelocate) return true;
  return false;
}
