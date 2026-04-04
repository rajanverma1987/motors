/**
 * SEO lead-engine: USA → state → city landing pages (documents/SEO.md).
 * Slugs are lowercase kebab-case for URLs.
 */

/** @typedef {{ name: string; slug: string; blurb: string }} SeoCity */
/** @typedef {{ name: string; slug: string; industryBlurb: string; stateIntroParagraphs: string[]; cities: SeoCity[] }} SeoState */

/** @type {SeoState[]} */
export const SEO_USA_STATES = [
  {
    name: "Texas",
    slug: "texas",
    industryBlurb:
      "Texas hosts massive petrochemical, LNG, power generation, and manufacturing corridors from the Gulf Coast to the Permian. Motor repair and rewinding shops that show up when plants search for emergency work and planned outages win the highest-value jobs.",
    stateIntroParagraphs: [
      "From Gulf Coast refineries and chemical complexes to Permian-region drilling support and statewide power-generation assets, Texas runs on rotating equipment that fails loudly when it stops. Buyers often choose the shop that answers clearly about field service, voltage classes, and realistic lead times—not the one with the prettiest homepage.",
      "This Texas-focused page helps motor repair and rewinding owners turn search intent into work: list your capabilities for statewide visibility, then run quotes, job cards, and billing in the same CRM your bench team actually uses.",
    ],
    cities: [
      {
        name: "Houston",
        slug: "houston",
        blurb:
          "Houston’s concentration of refineries, chemical plants, and port logistics means constant demand for industrial motor repair, pump work, and field service across the Ship Channel and surrounding counties.",
      },
      {
        name: "Dallas",
        slug: "dallas",
        blurb:
          "Dallas–Fort Worth blends aerospace, distribution, food production, and metal fabrication—each vertical depends on reliable motors and fast turnaround when production lines stop.",
      },
      {
        name: "Austin",
        slug: "austin",
        blurb:
          "Austin’s tech-adjacent manufacturing, data-center cooling, and regional contractors still lean on qualified motor shops for precision repair, balancing, and testing.",
      },
      {
        name: "San Antonio",
        slug: "san-antonio",
        blurb:
          "San Antonio supports defense suppliers, aerospace machining, and regional food processing—operations that need documented repairs and predictable lead times.",
      },
    ],
  },
  {
    name: "California",
    slug: "california",
    industryBlurb:
      "California’s mix of water infrastructure, food processing, semiconductor supply chains, and logistics hubs keeps demand for certified motor repair and energy-efficient rewinds steady—even as regulations push shops toward tighter documentation.",
    stateIntroParagraphs: [
      "California facilities juggle coastal logistics, Central Valley agriculture, advanced manufacturing, and some of the strictest documentation expectations in the country. Motor shops that spell out insulation systems, efficiency targets, and turnaround windows earn trust faster than shops that rely on word-of-mouth alone.",
      "If you operate here, use this page to position your shop for California buyers: a complete listing for discovery, plus MotorsWinding.com workflows so every inquiry becomes a traceable quote and job—not a sticky note on a monitor.",
    ],
    cities: [
      {
        name: "Los Angeles",
        slug: "los-angeles",
        blurb:
          "Greater Los Angeles ties together port logistics, aerospace, entertainment infrastructure, and food production—each needing motors that survive heavy cycles and quick turn repairs.",
      },
      {
        name: "San Diego",
        slug: "san-diego",
        blurb:
          "San Diego’s defense, biotech equipment, and cross-border manufacturing create steady need for precision balancing, testing, and documented repair trails.",
      },
      {
        name: "San Jose",
        slug: "san-jose",
        blurb:
          "The Bay Area’s advanced manufacturing and data infrastructure still routes critical spindle, pump, and HVAC motor work to specialized repair partners.",
      },
      {
        name: "Fresno",
        slug: "fresno",
        blurb:
          "Central Valley agriculture and food processing runs on motors exposed to dust, moisture, and seasonal peaks—shops that communicate fast response times win seasonal contracts.",
      },
    ],
  },
  {
    name: "Ohio",
    slug: "ohio",
    industryBlurb:
      "Ohio remains a backbone of automotive supply, steel, polymers, and general manufacturing—ideal territory for repair shops that can document quality and shorten customer downtime.",
    stateIntroParagraphs: [
      "Ohio’s plant floors still hum with stamping, plastics, metals, and tiered automotive work—each line stoppage puts pressure on whoever can restore a motor without drama. Visibility matters: maintenance teams compare vendors on proof, repeatability, and how fast you return a call when a spindle or pump motor drops offline.",
      "This Ohio page is built for owners who want more qualified repair work without adding headcount: show up with a strong profile, then keep intake-to-invoice disciplined inside MotorsWinding.com.",
    ],
    cities: [
      {
        name: "Cleveland",
        slug: "cleveland",
        blurb:
          "Cleveland’s legacy in metals, power equipment, and lakefront industry still feeds continuous motor repair, rebuild, and field service demand.",
      },
      {
        name: "Columbus",
        slug: "columbus",
        blurb:
          "Columbus anchors logistics, food production, and advanced manufacturing across central Ohio—facilities that compare vendors on speed, transparency, and repeatability.",
      },
      {
        name: "Cincinnati",
        slug: "cincinnati",
        blurb:
          "Greater Cincinnati blends consumer goods manufacturing, chemicals, and aerospace suppliers—each with tight tolerances and uptime expectations.",
      },
    ],
  },
  {
    name: "Illinois",
    slug: "illinois",
    industryBlurb:
      "Illinois concentrates food processing, packaging machinery, metals, and heavy transport around Chicago and regional hubs—motor failures ripple fast through just-in-time schedules.",
    stateIntroParagraphs: [
      "Chicago’s rail, food, and logistics ecosystem—and downstate manufacturing pockets—punish downtime harder than most regions. When a conveyor or mixer motor fails, buyers aren’t browsing for inspiration; they’re looking for a shop that can quote scope, stick to a date, and document what was done.",
      "Use this Illinois landing page to capture that intent: highlight your service footprint and specialties, then convert leads into structured work inside MotorsWinding.com so your shop floor and office stay aligned.",
    ],
    cities: [
      {
        name: "Chicago",
        slug: "chicago",
        blurb:
          "Chicago’s rail, food, printing, and logistics ecosystem depends on motors running around the clock—emergency repair and predictable shop capacity are premium services.",
      },
      {
        name: "Aurora",
        slug: "aurora",
        blurb:
          "Aurora and the western suburbs host metal fabrication, plastics, and distribution that need reliable motor partners within a short drive of I-88 and I-55.",
      },
    ],
  },
  {
    name: "Pennsylvania",
    slug: "pennsylvania",
    industryBlurb:
      "Pennsylvania’s energy, manufacturing, and logistics mix spans Marcellus-region equipment, legacy steel and machining, and East Coast distribution—each segment needs trustworthy motor repair partners.",
    stateIntroParagraphs: [
      "Pennsylvania stretches from Philadelphia’s port and packaging corridors to Pittsburgh’s advanced materials and legacy machining—and energy-field equipment in between. Buyers evaluate motor partners on honesty about lead times, documentation, and whether you’ve handled similar loads before.",
      "This page helps Pennsylvania repair shops compete on substance: a discoverable listing for the right searches, paired with CRM tools for quotes, WIP, and billing so growth doesn’t turn into chaos.",
    ],
    cities: [
      {
        name: "Philadelphia",
        slug: "philadelphia",
        blurb:
          "Philadelphia’s port, pharma packaging, and regional manufacturing create demand for motor repair, rewinding, and testing with clear turnaround commitments.",
      },
      {
        name: "Pittsburgh",
        slug: "pittsburgh",
        blurb:
          "Pittsburgh’s advanced materials, robotics, and energy infrastructure still route heavy motor work to shops that can prove quality and traceability.",
      },
    ],
  },
  {
    name: "Michigan",
    slug: "michigan",
    industryBlurb:
      "Michigan’s automotive tiers, tool-and-die, and automation integrators keep spindle, pump, and conveyor motor repair in constant motion—especially around Detroit and West Michigan.",
    stateIntroParagraphs: [
      "Michigan shops live in a world of tight production windows, automation retrofits, and repeat motor failures on high-cycle equipment. Winning work isn’t about generic SEO—it’s about proving you can handle the horsepower, balancing, and testing expectations that automotive-adjacent plants demand.",
      "Start here to reach buyers across Michigan with a profile that reflects real capabilities, then run the business on MotorsWinding.com so quotes, jobs, and invoices stay tied to the same record.",
    ],
    cities: [
      {
        name: "Detroit",
        slug: "detroit",
        blurb:
          "Southeast Michigan’s stamping, assembly support, and logistics operations rely on motors that can be repaired or rebuilt without missing production windows.",
      },
      {
        name: "Grand Rapids",
        slug: "grand-rapids",
        blurb:
          "Grand Rapids’ furniture, medical device, and food equipment manufacturers prize shops that communicate scope, price, and timeline clearly.",
      },
    ],
  },
  {
    name: "Florida",
    slug: "florida",
    industryBlurb:
      "Florida’s humidity, tourism infrastructure, and growing advanced manufacturing create unique motor stress—from coastal pump rooms to cold-chain distribution centers.",
    stateIntroParagraphs: [
      "Salt air, heat, and constant HVAC and pump loads punish motors across Florida’s coasts and inland corridors. Facilities want vendors who understand corrosion-adjacent failure modes, rush timelines during peak season, and clear communication when a chiller or process pump motor is down.",
      "This Florida page connects repair owners with buyers searching for help: publish what you do and where you travel, then keep every lead moving through MotorsWinding.com instead of scattered inboxes.",
    ],
    cities: [
      {
        name: "Miami",
        slug: "miami",
        blurb:
          "South Florida’s international trade, cold storage, and building systems demand reliable motor repair and pump work with rapid response.",
      },
      {
        name: "Tampa",
        slug: "tampa",
        blurb:
          "Tampa Bay’s port logistics, phosphate processing, and regional manufacturing create steady demand for industrial motor repair across the I-4 corridor.",
      },
      {
        name: "Orlando",
        slug: "orlando",
        blurb:
          "Central Florida blends hospitality infrastructure, distribution, and aerospace suppliers—each with motors that fail at the worst possible hour without a trusted shop.",
      },
      {
        name: "Jacksonville",
        slug: "jacksonville",
        blurb:
          "Jacksonville’s port, paper, and regional manufacturing base rewards repair shops that advertise clear capabilities and emergency availability.",
      },
    ],
  },
  {
    name: "New York",
    slug: "new-york",
    industryBlurb:
      "New York pairs dense urban infrastructure with upstate manufacturing and food processing—both need motor repair partners who can communicate urgency and compliance.",
    stateIntroParagraphs: [
      "New York’s mix of metro building systems, upstate process plants, and cross-border logistics leaves little patience for vague promises. Buyers often need documentation, tight access windows, and vendors who can coordinate rigging or freight without wasting a maintenance shift.",
      "Use this New York landing to stand out for the right reasons: a sharp listing for regional discovery, plus MotorsWinding.com to manage inquiries, scope changes, and billing with fewer mistakes.",
    ],
    cities: [
      {
        name: "New York City",
        slug: "new-york-city",
        blurb:
          "NYC’s building systems, transit-adjacent contractors, and outer-borough industry still route critical motor work to shops that can navigate tight schedules and access constraints.",
      },
      {
        name: "Buffalo",
        slug: "buffalo",
        blurb:
          "Buffalo’s advanced manufacturing, food production, and cross-border logistics depend on reliable motor repair through harsh winters and variable loads.",
      },
      {
        name: "Rochester",
        slug: "rochester",
        blurb:
          "Rochester’s optics, photonics, and precision manufacturing ecosystems need motors that are repaired, tested, and documented to tight standards.",
      },
    ],
  },
  {
    name: "Indiana",
    slug: "indiana",
    industryBlurb:
      "Indiana’s automotive, RV, steel, and logistics footprint keeps motor repair and rewinding demand high—especially near Indianapolis and northeast manufacturing hubs.",
    stateIntroParagraphs: [
      "The Crossroads of America still moves heavy freight, stamped metal, RV assemblies, and supplier plants that can’t afford long motor outages. Shops that respond fast—with clear quotes and realistic shop capacity—earn repeat work from procurement teams who compare three vendors on every failure.",
      "This Indiana page is for owners who want more of the right jobs: show your specialties and coverage area, then operationalize follow-through with MotorsWinding.com’s job and billing workflow.",
    ],
    cities: [
      {
        name: "Indianapolis",
        slug: "indianapolis",
        blurb:
          "Indianapolis anchors distribution, life sciences packaging, and advanced manufacturing that need predictable motor repair lead times and transparent quotes.",
      },
      {
        name: "Fort Wayne",
        slug: "fort-wayne",
        blurb:
          "Fort Wayne’s defense suppliers, metal fabrication, and specialty equipment builders rely on motor shops that can support complex rebuilds.",
      },
    ],
  },
  {
    name: "North Carolina",
    slug: "north-carolina",
    industryBlurb:
      "North Carolina’s growth in batteries, automotive, food, and pharma packaging creates a competitive landscape for motor repair shops that can differentiate on speed and service.",
    stateIntroParagraphs: [
      "North Carolina’s manufacturing mix is expanding fast—new plants, tighter production schedules, and more competition for reliable vendors. Motor repair isn’t a commodity here; it’s who can document tests, keep promises on lead time, and communicate when parts slip a day.",
      "Start on this page to attract buyers across the state: a detailed listing for search visibility, backed by MotorsWinding.com so leads become work orders and invoices without retyping data.",
    ],
    cities: [
      {
        name: "Charlotte",
        slug: "charlotte",
        blurb:
          "Charlotte’s banking-adjacent data infrastructure, logistics, and regional manufacturing create demand for motor repair, pump work, and documented testing.",
      },
      {
        name: "Raleigh",
        slug: "raleigh",
        blurb:
          "The Research Triangle’s biotech equipment, contract manufacturing, and cleantech pilots need motors serviced with traceability and clear communication.",
      },
      {
        name: "Greensboro",
        slug: "greensboro",
        blurb:
          "Greensboro’s textiles, furniture, logistics, and heavy equipment support still depend on industrial motor repair through seasonal peaks and supply-chain pressure.",
      },
    ],
  },
];

export const SEO_USA_HUB_PATH = "/usa/motor-repair-business-listing";

/** Shared benefit lines (documents/SEO.md — not “directory only”). */
export const SEO_DEFAULT_BENEFITS = [
  "More qualified repair and rewinding leads from buyers actively searching in your service area.",
  "Job cards, scheduling, and shop workflow so nothing falls through the cracks after the phone rings.",
  "Quotes, invoices, and payment tracking tuned for motor shops—not generic field service tools.",
  "A free Ultimate tier to get started fast; upgrade when you want deeper automation.",
];

/**
 * Expanded USA hub page (/usa/motor-repair-business-listing): grouped benefits for richer SEO content.
 * @type {{ title: string; items: string[] }[]}
 */
export const SEO_USA_HUB_BENEFIT_GROUPS = [
  {
    title: "Leads & visibility",
    items: [
      "Directory presence that reflects your real capabilities—voltages, motor types, industries served, certifications, and service region—so buyers self-match before they call.",
      "State and city landing pages across the USA that help you localize messaging for industrial-heavy regions without maintaining separate websites.",
      "Fewer wasted inquiries: when your profile is specific, procurement teams compare you on fit, not just price.",
      "Faster first response: inquiries land in the CRM inbox instead of scattered email threads.",
      "Optional marketplace visibility for surplus parts and equipment when you want to monetize inventory alongside repair work.",
    ],
  },
  {
    title: "Shop operations & workflow",
    items: [
      "Quotes and work orders with labor and parts lines that match how motor shops actually work—not generic “tickets.”",
      "Job board / floor visibility so everyone knows what’s in disassembly, rewind, balance, test, or ready to ship.",
      "Each customer's motors and history in one place so repeat failures are easier to diagnose and quote honestly.",
      "Parts catalog with reservations against jobs so you don’t promise dates you can’t hit.",
      "Receiving and shipping logistics tied to work orders so chain-of-custody is clear when customers ask “where’s my motor?”",
    ],
  },
  {
    title: "Billing, cash flow & trust",
    items: [
      "Invoices generated from completed scope so labor and material match what was approved—fewer disputes, faster payment.",
      "Accounts receivable and payment tracking so past-due work doesn’t hide in the shop floor noise.",
      "Customer-facing professionalism: consistent PDFs, terms, and follow-up history buyers expect from industrial vendors.",
      "Subscription and account options when you’re ready to grow; start with a strong free tier to prove value.",
      "API access for integrations when you need to sync with accounting or another system—so MotorsWinding.com can stay your operational source of truth.",
    ],
  },
];

/**
 * @param {string} placeLabel e.g. "the United States", "Texas", "Houston, Texas"
 */
export function buildSeoLeadFaq(placeLabel) {
  return [
    {
      q: `What does MotorsWinding.com do for shops in ${placeLabel}?`,
      a: "We combine lead generation with a motor-repair-focused CRM: list your capabilities, capture inquiries, and run jobs with quotes, invoices, and inventory-aware workflows—so you’re not juggling spreadsheets and missed callbacks.",
    },
    {
      q: "Is there a free way to get started?",
      a: "Yes. New accounts receive a Free Ultimate–style tier so you can list your business and use core CRM features without a credit card. Paid options exist when you want more capacity or support.",
    },
    {
      q: "How is this different from a plain business directory?",
      a: "A directory alone doesn’t run your shop. MotorsWinding.com is positioned around winning repair jobs and managing the workshop—your listing is the front door; the CRM is where work gets executed.",
    },
    {
      q: "Do you integrate payments or only leads?",
      a: "You can run quotes and invoices inside the system and keep subscription billing separate (e.g., PayPal) where enabled. The goal is one place to see pipeline, work in progress, and what’s billed.",
    },
    {
      q: "How fast can we go live?",
      a: "Many shops register, complete their listing, and start logging jobs the same week. If you want migration help from paper or another tool, contact us and we’ll align onboarding to your volume.",
    },
    {
      q: "How does MotorsWinding.com handle data privacy?",
      a: "Business and contact details submitted through listings and forms are used to deliver inquiries, quote follow-up, and CRM workflows. We do not sell your private contact data as a standalone data product. Access should be limited to authorized users in your team, and we recommend role-based access controls and strong passwords for your account.",
    },
  ];
}

export function getStateBySlug(stateSlug) {
  const s = String(stateSlug || "")
    .toLowerCase()
    .trim();
  return SEO_USA_STATES.find((x) => x.slug === s) || null;
}

export function getCityBySlugs(stateSlug, citySlug) {
  const state = getStateBySlug(stateSlug);
  if (!state) return null;
  const c = String(citySlug || "")
    .toLowerCase()
    .trim();
  const city = state.cities.find((x) => x.slug === c);
  if (!city) return null;
  return { state, city };
}

export function getAllStateStaticParams() {
  return SEO_USA_STATES.map((s) => ({ state: s.slug }));
}

export function getAllCityStaticParams() {
  const out = [];
  for (const state of SEO_USA_STATES) {
    for (const city of state.cities) {
      out.push({ state: state.slug, city: city.slug });
    }
  }
  return out;
}

/** Flat list for sitemap / internal linking */
export function getAllSeoCityEntries() {
  const rows = [];
  for (const state of SEO_USA_STATES) {
    for (const city of state.cities) {
      rows.push({
        stateSlug: state.slug,
        stateName: state.name,
        citySlug: city.slug,
        cityName: city.name,
        path: `/usa/${state.slug}/${city.slug}/motor-repair-business-listing`,
      });
    }
  }
  return rows;
}
