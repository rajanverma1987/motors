/**
 * Industry vertical landing pages, buyer identity SEO (File 2 of 3).
 * @typedef {object} IndustryPage
 * @property {string} slug
 * @property {string} industry
 * @property {string} industryTag
 * @property {string} title
 * @property {string} metaDescription
 * @property {string} h1
 * @property {string} subheading
 * @property {string} contextParagraph
 * @property {{ type: string; context: string }[]} commonMotors
 * @property {{ requirement: string; why: string }[]} shopRequirements
 * @property {{ mode: string; cause: string }[]} failureModes
 * @property {{ question: string; answer: string }[]} faqs
 * @property {{ label: string; href: string }[]} relatedLinks
 */

/** Maps form industryTag values to Listing.industriesServed keys. */
export const INDUSTRY_TAG_TO_LISTING_KEY = {
  manufacturing: "manufacturing",
  "water-treatment": "waterTreatment",
  "oil-gas": "oilGas",
  "food-processing": "foodProcessing",
  mining: "mining",
};

/** @param {string} tag */
export function industryTagToListingKey(tag) {
  const t = String(tag || "").trim();
  return INDUSTRY_TAG_TO_LISTING_KEY[t] || t;
}

/** @type {IndustryPage[]} */
export const industryPages = [
  {
    slug: "electric-motor-repair-manufacturing",
    industry: "Manufacturing",
    industryTag: "manufacturing",
    title: "Electric Motor Repair for Manufacturing Facilities | IQMotorBase",
    metaDescription:
      "Find electric motor repair shops experienced in manufacturing, conveyors, compressors, HVAC, and production line motors. Submit a repair request and get matched to shops in your area.",
    h1: "Electric motor repair for manufacturing",
    subheading:
      "Production line down? Find repair shops experienced in manufacturing motors, conveyors, compressors, pumps, blowers, and machine tool motors. Submit a request and get matched to shops in your area.",
    contextParagraph:
      "Manufacturing facilities run some of the most demanding motor applications in industry, continuous duty cycles, variable loads, harsh environments, and zero tolerance for unplanned downtime. A conveyor motor failure mid-shift can stop an entire production line. The shops best suited for manufacturing motor repair understand duty cycle requirements, application-specific winding specs, and the urgency of getting equipment back online fast.",
    commonMotors: [
      {
        type: "Conveyor and material handling motors",
        context:
          "Typically NEMA Design B or C, TEFC enclosure, three-phase. Failure is often bearing-related from belt tension and side loading. Rewind is common on larger frame sizes; bearing replacement dominates on smaller units.",
      },
      {
        type: "Compressor motors",
        context:
          "Often high-duty-cycle, high-starting-torque applications. NEMA Design C or D. Thermal failure from repeated starts is common. Confirm the shop understands compressor duty cycle when scoping the rewind.",
      },
      {
        type: "HVAC and fan motors",
        context:
          "Single-phase and three-phase, ODP or TEFC. Typically lower HP but high volume. Many HVAC motors are ECM or PSC types, confirm the shop handles your specific motor type before shipping.",
      },
      {
        type: "Machine tool spindle motors",
        context:
          "Precision balance, close tolerances, often inverter-fed. Spindle repair requires dynamic balancing to G1.0 or better and encoder replacement if equipped. Not all shops have spindle capability, confirm before sending.",
      },
      {
        type: "Pump and hydraulic motors",
        context:
          "Common in washdown, cooling, and process flow applications. TEFC or explosion-proof enclosures. Bearing and seal failure common. Confirm shop handles the specific frame and enclosure type.",
      },
    ],
    shopRequirements: [
      {
        requirement: "Manufacturing industry references",
        why: "Motor repair for manufacturing applications often requires familiarity with continuous duty cycles, high-cycle starts, and application-specific winding thermal requirements. Ask for references in your industry segment.",
      },
      {
        requirement: "Rush turnaround capability",
        why: "Production downtime is costly. A shop that can commit to a 48 to 72 hour turnaround on standard rewinds is worth a premium over a shop with a 2-week queue.",
      },
      {
        requirement: "EASA AR100 compliance",
        why: "EASA AR100 rewind standards include core loss testing before and after burnout, the step that protects motor efficiency. For motors running 24/7 in production, efficiency degradation compounds into significant annual energy cost.",
      },
      {
        requirement: "Dynamic balancing",
        why: "Improperly balanced rotors cause vibration that damages bearings in downstream equipment. Shops serving manufacturing should have in-house balancing capability to ISO 1940 G2.5 or better.",
      },
    ],
    failureModes: [
      {
        mode: "Bearing failure from side loading",
        cause: "Belt-driven conveyors and fans create radial loads that exceed bearing ratings when belts are over-tensioned or misaligned. Verify shaft alignment and belt tension on reinstallation.",
      },
      {
        mode: "Insulation breakdown from duty cycle",
        cause: "Motors running continuous or severe duty at high ambient temperatures age insulation faster. Class F or H insulation systems extend life; a rewind is an opportunity to upgrade from Class B.",
      },
      {
        mode: "Contamination from process environment",
        cause: "Metal dust, coolant mist, and process chemicals enter through ventilation openings on ODP motors. TEFC enclosures or shaft seals prevent most contamination-related failures.",
      },
    ],
    faqs: [
      {
        question: "How do I find a motor repair shop experienced in manufacturing applications?",
        answer:
          "Use the IQMotorBase directory and filter by the \"Manufacturing\" industry tag on shop profiles. You can also submit a repair request through this page, we tag your request with manufacturing industry context so shops with manufacturing experience are matched first.",
      },
      {
        question: "What is the typical turnaround for a manufacturing motor repair?",
        answer:
          "Standard turnaround for most manufacturing motors under 100 HP is 5 to 10 business days. Emergency turnaround for production-critical motors is 24 to 72 hours at shops with 24/7 capability. Always confirm turnaround in writing before authorizing the repair.",
      },
      {
        question: "Can I get a loaner motor while mine is in repair?",
        answer:
          "Many shops that serve manufacturing facilities maintain loaner inventory for common NEMA frame sizes. Ask specifically when you submit your request, if loaners are available, this is the fastest way to restore partial production while your motor is rewound.",
      },
    ],
    relatedLinks: [
      { label: "Find motor repair shops near me", href: "/electric-motor-repair-near-me" },
      { label: "Emergency motor repair: what to do", href: "/emergency-motor-repair-what-to-do" },
      { label: "Motor repair vs. replace: decision guide", href: "/when-to-repair-or-replace-electric-motor" },
      { label: "Motor repair cost guide", href: "/cost-of-motor-repair-and-rewinding" },
      { label: "Industrial motor repair", href: "/industrial-motor-repair" },
    ],
  },
  {
    slug: "electric-motor-repair-water-treatment",
    industry: "Water Treatment",
    industryTag: "water-treatment",
    title: "Electric Motor Repair for Water Treatment Plants | IQMotorBase",
    metaDescription:
      "Find electric motor repair shops experienced in water and wastewater treatment, pumps, blowers, aerators, and submersible motors. Submit a repair request matched to shops in your area.",
    h1: "Electric motor repair for water treatment",
    subheading:
      "Pump or blower motor down at your water or wastewater facility? Find shops with water treatment experience, submersible motors, aeration blowers, and process pumps. Submit a request and get matched.",
    contextParagraph:
      "Water and wastewater treatment facilities run motors in some of the harshest conditions in industry, wet environments, corrosive atmospheres, continuous duty, and strict regulatory requirements. Pump and blower motor failures directly affect treatment capacity and regulatory compliance. Shops with water treatment experience understand submersible motor repair, explosion-proof requirements for digester applications, and the documentation standards that regulated utilities require.",
    commonMotors: [
      {
        type: "Submersible pump motors",
        context:
          "Operate fully submerged in water or wastewater. Require specialized shaft seal and enclosure repair capability. Not all shops have submersible motor experience, confirm before sending. Stator rewinding requires appropriate insulation systems for wet environments.",
      },
      {
        type: "Aeration blower motors",
        context:
          "Large three-phase motors running continuous duty driving positive displacement or centrifugal blowers. Thermal failures from high ambient temperature around blower housings are common. Frame sizes typically NEMA 254T through 449T.",
      },
      {
        type: "Vertical turbine pump motors",
        context:
          "Hollow-shaft vertical motors mounted on well pumps and large process pumps. Require specific thrust bearing capability and shaft coupling knowledge. Ask whether the shop has vertical motor repair experience.",
      },
      {
        type: "Explosion-proof motors (digester applications)",
        context:
          "Class I Division 1 or 2 rated motors for biogas and digester areas. Repair of explosion-proof motors requires maintaining the integrity of the explosion-proof enclosure, only shops with experience in XP motor repair should handle these.",
      },
    ],
    shopRequirements: [
      {
        requirement: "Water/wastewater industry references",
        why: "Utilities often have documentation requirements (material certifications, test reports, traveler sheets) that general industrial shops may not provide as standard. Ask for references at comparable utilities.",
      },
      {
        requirement: "Submersible motor capability",
        why: "Submersible motor repair requires specific shaft seal expertise and insulation systems. A shop without submersible experience will typically send the motor to a subcontractor, adding time and cost.",
      },
      {
        requirement: "Explosion-proof enclosure integrity",
        why: "If your motor is rated XP (explosion-proof), the repair must maintain the flame path integrity of the enclosure. This is a regulatory requirement, not just a best practice. Confirm the shop understands this before authorizing work.",
      },
      {
        requirement: "Test reports and documentation",
        why: "Many utilities require documented test results (insulation resistance, winding resistance, hi-pot test, no-load run) for their asset management records. Confirm the shop provides a written test report with every repair.",
      },
    ],
    failureModes: [
      {
        mode: "Seal failure on submersible motors",
        cause: "Water ingress through degraded shaft seals is the most common submersible motor failure. Regular seal inspection during planned maintenance prevents catastrophic winding failure.",
      },
      {
        mode: "Overheating on continuous-duty blower motors",
        cause: "Aeration blowers run 24/7. Ambient temperature around blower enclosures is often 15 to 25°C above ambient. Class F or H insulation and adequate motor cooling are essential.",
      },
      {
        mode: "Corrosion in wet well environments",
        cause: "Hydrogen sulfide and other corrosive gases in wet well and digester environments attack motor enclosures and internal windings. Sealed or epoxy-coated windings extend service life.",
      },
    ],
    faqs: [
      {
        question: "Who repairs submersible pump motors near me?",
        answer:
          "Submit a repair request on this page, tag your motor type as submersible and we'll match you to shops in your area with confirmed submersible motor repair capability. Not all general motor repair shops handle submersibles, so the match matters.",
      },
      {
        question: "Do motor repair shops provide the documentation that utilities require?",
        answer:
          "Many do, but not all. Ask specifically for a written test report including insulation resistance (megohm) values, winding resistance measurements, hi-pot test results, and no-load run data. EASA-accredited shops provide this as standard.",
      },
      {
        question: "Can an explosion-proof motor be repaired without losing its XP rating?",
        answer:
          "Yes, but only by shops that understand explosion-proof enclosure repair. The flame path dimensions, thread engagement, and surface finish of the enclosure must be maintained to the original UL or FM specifications. Ask the shop directly whether they have XP enclosure repair experience.",
      },
    ],
    relatedLinks: [
      { label: "Find motor repair shops near me", href: "/electric-motor-repair-near-me" },
      { label: "Emergency motor repair", href: "/emergency-motor-repair-what-to-do" },
      { label: "Types of electric motor repair services", href: "/types-of-electric-motor-repair-services" },
      { label: "How to choose a motor repair shop", href: "/how-to-choose-electric-motor-repair-shop" },
      { label: "Motor repair cost guide", href: "/cost-of-motor-repair-and-rewinding" },
    ],
  },
  {
    slug: "electric-motor-repair-oil-gas",
    industry: "Oil & Gas",
    industryTag: "oil-gas",
    title: "Electric Motor Repair for Oil & Gas | Hazardous Location Specialists | IQMotorBase",
    metaDescription:
      "Find motor repair shops experienced in oil and gas applications, hazardous location, explosion-proof, and high-voltage motors. Submit a repair request matched to qualified shops.",
    h1: "Electric motor repair for oil and gas",
    subheading:
      "Motor failure at an upstream, midstream, or downstream facility? Find shops qualified for hazardous location and explosion-proof motor repair. Submit a request, matched to shops with oil and gas experience.",
    contextParagraph:
      "Oil and gas facilities operate motors in Class I hazardous locations, high-voltage applications, and remote environments where downtime is measured in tens of thousands of dollars per hour. Motor repair for this sector requires hazardous location compliance, high-voltage rewind capability, and often field service for motors that cannot be safely removed. The directory shops with oil and gas experience are qualified for these requirements, general repair shops typically are not.",
    commonMotors: [
      {
        type: "Explosion-proof (XP) motors, Class I Div 1 and Div 2",
        context:
          "Wellhead, compressor station, and processing plant applications. Repair must maintain explosion-proof enclosure integrity per UL 674 or FM standards. Only shops with demonstrated XP enclosure repair experience should handle these.",
      },
      {
        type: "High-voltage motors (above 4kV)",
        context:
          "Pipeline compressors, refinery process pumps, and upstream pumping stations often use 4,160V or 13.2kV motors. High-voltage rewind requires form-wound coil construction, specialized hi-pot testing, and experience at your specific voltage class.",
      },
      {
        type: "ESP (electric submersible pump) motors",
        context:
          "Downhole pump motors for artificial lift applications. Highly specialized, only a small number of shops perform ESP motor repair. Contact us for specialist referrals.",
      },
      {
        type: "Large frame TEFC and WP-II motors",
        context:
          "Compressor drivers and pump motors above 500 HP are common in midstream and downstream. These require crane capacity, large frame rewind capability, and often dynamic balancing to API 541 standards.",
      },
    ],
    shopRequirements: [
      {
        requirement: "Hazardous location compliance",
        why: "Class I Div 1/2 motor repair requires maintaining flame path integrity and proper enclosure markings. Regulatory compliance (OSHA PSM, API standards) often requires documented shop qualification for this work.",
      },
      {
        requirement: "High-voltage rewind capability",
        why: "Motors above 4kV require form-wound coil construction, specialized winding equipment, and hi-pot testing at voltages most shops cannot safely achieve. Confirm the shop has rewound at your specific voltage class.",
      },
      {
        requirement: "API 541 / API 547 familiarity",
        why: "Upstream and midstream operators often specify API 541 (large induction motors) or API 547 (general purpose motors) for repair documentation. Ask whether the shop is familiar with these specifications.",
      },
      {
        requirement: "Field service capability",
        why: "Many oil and gas motors cannot be safely removed from their installation for transport to a shop. Field assessment, on-site diagnostics, and in-place repair capability are often required.",
      },
    ],
    failureModes: [
      {
        mode: "Insulation failure on high-voltage motors",
        cause: "Partial discharge in form-wound coil insulation progresses over years of operation. Annual hi-pot or partial discharge testing identifies developing failures before catastrophic breakdown.",
      },
      {
        mode: "Bearing failure on compressor drivers",
        cause: "High-speed compressor applications and misalignment from thermal growth cause bearing failures. API 541 specifies anti-friction bearing design standards for this application.",
      },
      {
        mode: "Contamination in hazardous environments",
        cause: "Hydrocarbon vapor and hydrogen sulfide environments attack winding insulation over time. Epoxy-encapsulated windings and sealed enclosures reduce ingress.",
      },
    ],
    faqs: [
      {
        question: "Who can repair explosion-proof motors for oil and gas applications?",
        answer:
          "Shops qualified to repair XP motors maintain the flame path integrity of the enclosure per the original UL or FM certification requirements. Submit your request on this page with \"explosion-proof\" specified in the motor type, we match to shops with confirmed XP capability.",
      },
      {
        question: "Can high-voltage motors above 4kV be rewound in the field?",
        answer:
          "In most cases, high-voltage motors must be transported to a shop with form-wound coil capability and appropriate hi-pot testing equipment. For extremely large or fixed motors, partial field repair (coil replacement, insulation testing) is possible but full rewinds typically require shop access.",
      },
      {
        question: "What documentation is typically required for oil and gas motor repair?",
        answer:
          "Operators typically require: full test report (insulation resistance, winding resistance, hi-pot, no-load run), material certifications for magnet wire and insulation, before/after core loss test results (EASA AR100), and repair traveler documenting every step. Confirm the shop provides all of these before authorizing work.",
      },
    ],
    relatedLinks: [
      { label: "High voltage motor repair", href: "/types-of-electric-motor-repair-services" },
      { label: "Find motor repair shops near me", href: "/electric-motor-repair-near-me" },
      { label: "Emergency motor repair", href: "/emergency-motor-repair-what-to-do" },
      { label: "How to choose a motor repair shop", href: "/how-to-choose-electric-motor-repair-shop" },
      { label: "Types of electric motor repair", href: "/types-of-electric-motor-repair-services" },
    ],
  },
  {
    slug: "electric-motor-repair-food-processing",
    industry: "Food Processing",
    industryTag: "food-processing",
    title: "Electric Motor Repair for Food Processing Facilities | IQMotorBase",
    metaDescription:
      "Find motor repair shops experienced in food processing, washdown-duty, stainless, and USDA/FDA-compliant motor repair. Submit a repair request matched to qualified shops near you.",
    h1: "Electric motor repair for food processing",
    subheading:
      "Motor down on a food processing line? Find shops with washdown-duty and food-grade motor repair experience. Submit a request, matched to shops that understand food facility requirements.",
    contextParagraph:
      "Food processing facilities operate motors in environments that most general repair shops have never worked in, daily high-pressure washdowns, stainless steel requirements, food-grade lubricants, and USDA or FDA compliance obligations. A motor repair that returns a standard TEFC motor into a washdown environment will fail in weeks. The right shop understands washdown-duty enclosures, food-grade grease, and the hygiene requirements of your facility.",
    commonMotors: [
      {
        type: "Washdown-duty motors",
        context:
          "IP66 or NEMA 4X rated motors designed for high-pressure water spray. Repair must restore full IP rating including shaft seals, enclosure gaskets, and drain plugs. Confirm the shop restores washdown integrity, not just electrical function.",
      },
      {
        type: "Stainless steel enclosure motors",
        context:
          "Used in sanitary processing areas requiring all-stainless wetted surfaces. Repair requires matching stainless components, standard carbon steel replacement hardware is a compliance failure.",
      },
      {
        type: "Conveyor and packaging line motors",
        context:
          "High-cycle duty, often inverter-fed, running in humid or cold (refrigerated) environments. Inverter-duty insulation systems prevent partial discharge failure in VFD applications.",
      },
      {
        type: "Mixer and agitator motors",
        context:
          "High-torque applications with frequent reversals. NEMA Design D characteristics common. Shaft seal integrity is critical, lubricant contamination of food product is a regulatory failure.",
      },
    ],
    shopRequirements: [
      {
        requirement: "Washdown enclosure restoration",
        why: "A motor returned without restored shaft seals, gaskets, and drain plugs will fail in the first washdown cycle. Confirm the shop restores full IP66/NEMA 4X integrity as part of the repair scope.",
      },
      {
        requirement: "Food-grade lubricants",
        why: "Bearings in food-contact or splash-zone applications must be lubricated with H1 food-grade grease. Standard industrial lubricants are a compliance violation in food facilities. Confirm the shop uses NSF H1 approved lubricants when requested.",
      },
      {
        requirement: "Inverter-duty insulation",
        why: "Most modern food processing lines use VFDs for speed control. Rewinding with standard magnet wire on an inverter-fed application leads to rapid insulation failure from voltage spikes. Request inverter-duty insulation system on any rewind that will be VFD-operated.",
      },
    ],
    failureModes: [
      {
        mode: "Washdown water ingress",
        cause: "Degraded shaft seals and enclosure gaskets allow high-pressure washdown water into the motor. Wet windings fail quickly. Inspect and replace seals and gaskets at every maintenance interval.",
      },
      {
        mode: "Partial discharge failure on VFD-fed motors",
        cause: "Voltage spikes from VFD switching degrade standard magnet wire insulation faster than line-fed operation. Inverter-duty wire and insulation systems are required for motors operated on VFDs.",
      },
      {
        mode: "Corrosion in cold storage environments",
        cause: "Temperature cycling in refrigerated areas causes condensation inside motor enclosures. Space heaters, sealed enclosures, and corrosion-resistant hardware prevent moisture-related failures.",
      },
    ],
    faqs: [
      {
        question: "Can a standard motor repair shop work on washdown-duty motors?",
        answer:
          "Electrically, yes, but most general shops do not restore the washdown-duty IP rating as part of the repair. Shaft seals, enclosure gaskets, and drain plugs must be replaced and tested for IP66/NEMA 4X integrity. Submit your request specifying washdown-duty, we match to shops that restore full enclosure integrity.",
      },
      {
        question: "Does the motor repair need to use food-grade grease?",
        answer:
          "For motors in food-contact or splash zones, yes, NSF H1 approved lubricants are required for compliance. Specify this requirement when you submit your repair request and confirm with the shop before authorizing work.",
      },
      {
        question: "What is inverter-duty motor repair and do I need it?",
        answer:
          "If your motor is controlled by a VFD (variable frequency drive), it should be rewound with inverter-duty magnet wire and insulation. Standard wire degrades faster under VFD voltage spikes. If you're not sure whether your motor is VFD-operated, check the control panel or ask your maintenance team before the shop begins the rewind.",
      },
    ],
    relatedLinks: [
      { label: "Find motor repair shops near me", href: "/electric-motor-repair-near-me" },
      { label: "Types of electric motor repair", href: "/types-of-electric-motor-repair-services" },
      { label: "Emergency motor repair", href: "/emergency-motor-repair-what-to-do" },
      { label: "Motor repair cost guide", href: "/cost-of-motor-repair-and-rewinding" },
      { label: "How to choose a repair shop", href: "/how-to-choose-electric-motor-repair-shop" },
    ],
  },
  {
    slug: "electric-motor-repair-mining",
    industry: "Mining",
    industryTag: "mining",
    title: "Electric Motor Repair for Mining Operations | IQMotorBase",
    metaDescription:
      "Find motor repair shops experienced in mining, large frame, high-voltage, explosion-proof, and severe-duty motor repair. Submit a repair request matched to qualified shops near you.",
    h1: "Electric motor repair for mining operations",
    subheading:
      "Large frame or severe-duty motor down at your mine site? Find shops with mining experience, high-voltage, explosion-proof, and large frame rewind capability. Submit a request and get matched.",
    contextParagraph:
      "Mining operations run some of the largest and most demanding motors in industry, dragline motors, mill drives, conveyor systems, and hoists operating at extreme duty cycles in remote, harsh environments. Motor failures at mine sites involve enormous downtime costs and often complex logistics. Shops experienced in mining motor repair have large crane capacity, high-voltage rewind capability, and experience with the documentation and reliability requirements of mining operations.",
    commonMotors: [
      {
        type: "Large frame conveyor motors (above 200 HP)",
        context:
          "Belt conveyor drives are often the highest-consequence motor in a mine, a conveyor failure stops material flow entirely. Frame sizes from 447T through 5000-series. Rewinds require large crane capacity and high-voltage capability for MV conveyor drives.",
      },
      {
        type: "Mill and crusher motors",
        context:
          "SAG mills, ball mills, and gyratory crushers use wound rotor or synchronous motors at very large HP. These are specialty rewinds requiring form-wound coils, high-voltage testing, and OEM specification compliance.",
      },
      {
        type: "Explosion-proof motors (underground and surface coal)",
        context:
          "MSHA-rated explosion-proof motors for underground mining require MSHA-specific flame path and enclosure standards, different from general XP ratings. Only shops with MSHA XP experience should handle these.",
      },
      {
        type: "Hoist and crane motors",
        context:
          "DC hoist motors and wound rotor AC motors for mine hoists and overhead cranes are safety-critical applications. Repair must meet the original design specifications, no substitutions on slip ring, brush gear, or armature winding without engineering review.",
      },
    ],
    shopRequirements: [
      {
        requirement: "Large crane capacity (10+ tons)",
        why: "Mining motors above 500 HP often weigh 5,000 to 20,000 lbs. A shop without adequate crane capacity cannot safely handle these motors. Ask specifically about crane capacity and shop floor clearance.",
      },
      {
        requirement: "High-voltage rewind capability",
        why: "Medium-voltage mining motors (4,160V–13,200V) require form-wound coils and hi-pot testing at voltage levels most shops cannot safely achieve. Ask for references on rewinds at your specific voltage class.",
      },
      {
        requirement: "MSHA experience (underground mining)",
        why: "MSHA-rated motors have specific enclosure requirements distinct from general XP ratings. Shops without MSHA experience may restore electrical function while violating the MSHA enclosure specification.",
      },
    ],
    failureModes: [
      {
        mode: "Thermal failure from extreme duty cycles",
        cause: "Mining conveyor and hoist motors often run at 100%+ of nameplate load for extended periods. Class H insulation and proper ventilation are essential; Class B insulation is insufficient for mining duty.",
      },
      {
        mode: "Dust and abrasive contamination",
        cause: "Coal dust, silica, and process dust enter motor enclosures in mining environments. TEFC enclosures with positive pressure purge or totally enclosed air-over designs prevent contamination-related failures.",
      },
      {
        mode: "Vibration from crusher and mill applications",
        cause: "High vibration from crushers and mills damages bearings and loosens winding end turns over time. Vibration isolation and periodic end-turn tightening prevent progressive damage.",
      },
    ],
    faqs: [
      {
        question: "Who repairs large frame mining motors near me?",
        answer:
          "Submit your repair request specifying the motor HP, frame size, and voltage, we match to shops with confirmed large frame rewind capability and the crane capacity to handle your motor. Not all shops can handle motors above 500 HP.",
      },
      {
        question: "Can a mine hoist motor be repaired or does it need to be replaced?",
        answer:
          "Mine hoist motors are almost always candidates for repair, replacement lead times for large hoist motors can be 6 to 18 months. The key is finding a shop with the DC or wound rotor AC rewind experience specific to hoist applications. Submit your details and we will match to the right shop.",
      },
      {
        question: "What is the typical cost of repairing a large frame mining motor?",
        answer:
          "Large frame mining motor rewinds (above 200 HP) typically range from $15,000 to $100,000+ depending on HP, voltage class, frame size, and repair scope. High-voltage and specialty mining motors are quoted individually after engineering review. See our cost guide for US benchmark ranges.",
      },
    ],
    relatedLinks: [
      { label: "Find motor repair shops near me", href: "/electric-motor-repair-near-me" },
      { label: "Industrial motor repair guide", href: "/industrial-motor-repair" },
      { label: "Emergency motor repair", href: "/emergency-motor-repair-what-to-do" },
      { label: "Motor repair cost guide", href: "/cost-of-motor-repair-and-rewinding" },
      { label: "Types of motor repair services", href: "/types-of-electric-motor-repair-services" },
    ],
  },
];

/** @param {string} slug */
export function getIndustryPageBySlug(slug) {
  const page = industryPages.find((p) => p.slug === slug);
  if (!page) throw new Error(`Unknown industry page slug: ${slug}`);
  return page;
}

export const INDUSTRY_PAGE_SLUGS = industryPages.map((p) => p.slug);
