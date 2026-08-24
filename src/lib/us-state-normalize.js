import { US_STATES } from "@/lib/directory-listing-constants";

/** US state/territory abbreviation → full name (50 states + DC). */
const ABBREV_TO_STATE = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const STATE_LOOKUP = new Map(US_STATES.map((name) => [name.toLowerCase(), name]));

/**
 * Normalize free-text state input to canonical full name from US_STATES when possible.
 * Accepts abbreviations (TX), full names (Texas), and mixed case.
 */
export function normalizeUsState(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";

  const abbrev = trimmed.toUpperCase();
  if (ABBREV_TO_STATE[abbrev]) return ABBREV_TO_STATE[abbrev];

  const byName = STATE_LOOKUP.get(trimmed.toLowerCase());
  if (byName) return byName;

  return trimmed;
}

/**
 * Normalize city/state/zip for location search and storage.
 */
export function normalizeLocationInput({ city, state, zip } = {}) {
  const rawZip = String(zip || "").trim().replace(/\D/g, "");
  return {
    city: String(city || "").trim(),
    state: normalizeUsState(state),
    zip: rawZip.length >= 5 ? rawZip.slice(0, 5) : rawZip,
  };
}
