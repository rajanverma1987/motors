/**
 * Long-form copy blocks for /usa/... SEO landings (thick content + localization).
 */

/**
 * @param {{ industryBlurb: string }} state
 * @param {{ name: string; blurb: string }} city
 */
export function buildCityLeadCopy(state, city) {
  return {
    problemTitle: "The real problem isn’t “more ads”—it’s missed jobs and messy follow-up",
    problemParagraphs: [
      `In ${city.name} and across ${state.name}, maintenance teams still call the shop they remember—or the first name that appears when a motor drops offline. If your Google footprint is thin, your phone stays quiet even when plants nearby are desperate.`,
      "Meanwhile, internal chaos hurts just as much: job folders on the desk, parts guessed from memory, and invoices sent late. You don’t need another generic CRM—you need visibility from first call to paid invoice, tuned for motor repair and rewinding.",
      `${city.blurb}`,
    ],
    solutionTitle: "List your shop where buyers search—then run the job in one system",
    solutionParagraphs: [
      `MotorsWinding.com helps motor repair businesses in ${city.name} show up with a rich profile (services, voltages, industries, certifications, and service region) so buyers compare you on substance, not guesswork. That listing works as the top of your funnel.`,
      "Behind the listing is a workshop CRM: leads, quotes, job cards, billing, and inventory context so your team executes without dropping handoffs. You’re not paying for “directory vanity metrics”—you’re building a pipeline you can measure.",
      `${state.industryBlurb}`,
    ],
    introParagraphs: [
      `Industrial buyers and facility teams in ${city.name}, ${state.name} don’t have time to hunt for a motor shop when a line is down. They search, shortlist, and call fast. If your capabilities aren’t visible—and your follow-up isn’t systematic—you lose the job to a competitor who answered first and sounded organized.`,
      `This page is for owners who want more repair and rewinding work in ${city.name}: clearer positioning online, faster responses to inquiries, and a CRM that matches how motor shops actually operate (quotes, job documentation, billing).`,
    ],
  };
}

/**
 * @param {{ name: string; industryBlurb: string; stateIntroParagraphs?: string[]; cities: { name: string }[] }} state
 */
export function buildStateLeadCopy(state) {
  const cityList = state.cities.map((c) => c.name).join(", ");
  const introParagraphs =
    Array.isArray(state.stateIntroParagraphs) && state.stateIntroParagraphs.length > 0
      ? state.stateIntroParagraphs
      : [
          `${state.name} is dense with manufacturing, logistics, and infrastructure that depend on rotating equipment. Motor repair and rewinding shops power that ecosystem—but only if they’re discoverable when pumps, fans, compressors, and line motors fail.`,
          `If you serve ${state.name}, this is your hub to list your business for more qualified inquiries and adopt a CRM that’s built around repair jobs—not generic tickets. You’ll connect your listing to the same workspace your team uses every day.`,
        ];
  return {
    problemTitle: "Why great motor shops in " + state.name + " still lose work",
    problemParagraphs: [
      `Across ${state.name}, plants and contractors compare shops on speed, clarity, and proof of capability—not just price. If your website is outdated and your intake is informal, you’re invisible to new buyers even when your bench work is excellent.`,
      "Manual tracking breaks down when volume spikes: emergency calls stack, parts orders slip, and invoices lag. That’s not a discipline problem—it’s a systems problem. Shops that centralize leads and jobs respond faster and look more professional on every quote.",
      `${state.industryBlurb}`,
    ],
    solutionTitle: "Get found + stay organized with a motor-repair-first workflow",
    solutionParagraphs: [
      `Use MotorsWinding.com to publish a complete profile for ${state.name} searches and route inbound leads into structured quotes and job cards. You’re not “buying leads” blindly—you’re converting demand that already exists in industrial corridors like ${cityList}.`,
      "Pair visibility with operations: track what’s quoted, what’s in the shop, and what’s billed—so cash flow matches labor and parts on the floor.",
    ],
    introParagraphs,
  };
}

export function buildUsaLeadCopy() {
  return {
    problemTitle: "Motor repair shops lose money twice: weak visibility + chaotic job tracking",
    problemParagraphs: [
      "Across the United States, industrial and commercial buyers still search online for motor repair, rewinding, balancing, and field service. Shops that don’t clearly publish capabilities, geography, and certifications get skipped—even if their bench work is world-class.",
      "On the operations side, paper job bags and scattered spreadsheets break down when mix increases: quotes stall, WIP is unclear, and invoices go out late. That’s not a people problem—it’s the cost of tools that weren’t built for motor shops.",
      "The shops winning in 2026 combine discoverability with disciplined execution: they show up where buyers look, and they run the job lifecycle in one place.",
    ],
    solutionTitle: "More repair jobs + a CRM that fits the workshop",
    solutionParagraphs: [
      "MotorsWinding.com is positioned as a system to get more repair work and manage the workshop—not a passive listing. Start with a rich profile so buyers understand what you do and where you travel, then run leads through quotes, job cards, and billing in the same platform.",
      "Whether you’re a single-location rewind shop or a multi-bay operation with field service, the goal is the same: shorten response time, reduce dropped handoffs, and make revenue predictable.",
      "You can also plug into broader MotorsWinding.com tooling over time—parts inventory, purchase orders, vendor records, and reporting—without bolting on five disconnected apps that your team refuses to adopt.",
    ],
    introParagraphs: [
      "If you own or operate an electric motor repair, rewinding, or rotating equipment shop in the United States, you’re competing on trust, speed, and proof—not flashy marketing. Buyers want to know you can handle their voltage range, turnaround, and documentation before they risk downtime.",
      "This national hub connects you to state and city pages where industrial density is highest—so you can localize your message—while keeping the same core promise: get in front of buyers when they’re searching, and run the job professionally once they call.",
      "Below you’ll find a detailed breakdown of what you get: lead generation, shop workflow, and billing—so you can see how the platform supports the full lifecycle, not just a one-time listing.",
    ],
  };
}
