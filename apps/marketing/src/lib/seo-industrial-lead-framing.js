/**
 * Shared industrial-only SEO framing for public marketing pages.
 * Aligns with lead qualification (platform floor 5 HP; no residential / pool / spa routing).
 */

export const SEO_INDUSTRIAL_MIN_HP = 5;

export const SEO_INDUSTRIAL_SCOPE_LINE =
  `Industrial and commercial electric motors ${SEO_INDUSTRIAL_MIN_HP} HP and above (plant, facility, OEM). Residential, homeowner, pool, and spa pump motors are outside this network.`;

/** Prefer these in metadata keywords (local industrial intent, not homeowner “near me”). */
export const SEO_INDUSTRIAL_KEYWORD_CORE = [
  "industrial motor repair",
  "industrial electric motor repair",
  "industrial motor rewinding",
  "plant motor repair",
  "commercial electric motor repair",
  "facility motor repair shop",
  "AC motor rewinding industrial",
  "DC motor repair industrial",
  "medium voltage motor repair",
  "emergency industrial motor repair",
  "industrial motor repair near me",
  "industrial motor rewinding near me",
];

/**
 * @param {string} areaLabel
 */
export function buildIndustrialLocationSeoTitle(areaLabel) {
  const area = String(areaLabel || "").trim() || "Your Area";
  return `Industrial Motor Repair & Rewinding in ${area} | 3PhaseFlow`;
}

/**
 * @param {string} areaLabel
 */
export function buildIndustrialLocationSeoDescription(areaLabel) {
  const area = String(areaLabel || "").trim() || "your area";
  return (
    `Find industrial and commercial electric motor repair shops in ${area} ` +
    `(${SEO_INDUSTRIAL_MIN_HP}+ HP plant and facility work). Rewinding, testing, and emergency service. ` +
    `Not for residential, pool, or spa motors.`
  );
}

/**
 * @param {string} areaLabel
 */
export function buildIndustrialLocationOgDescription(areaLabel) {
  const area = String(areaLabel || "").trim() || "your area";
  return (
    `Industrial motor repair and rewinding shops serving ${area}. ` +
    `${SEO_INDUSTRIAL_MIN_HP}+ HP plant and facility motors. Submit a qualified repair request.`
  );
}
