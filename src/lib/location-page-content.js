/**
 * Default copy and FAQ for /motor-repair-shop/[slug] location pages.
 */

export function buildLocationAreaLabel(page) {
  const city = String(page?.city || "").trim();
  const state = String(page?.state || "").trim();
  const zip = String(page?.zip || "").trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  if (zip) return zip;
  return String(page?.title || "this area").replace(/^Motor Repair Shops in\s+/i, "").trim() || "this area";
}

export function buildLocationIntroParagraphs(areaLabel, insights) {
  const total = insights?.total || 0;
  const rewinding = insights?.rewinding || 0;
  const basedIn = insights?.basedIn || 0;

  return [
    `This page lists ${total} motor repair and rewinding ${total === 1 ? "center" : "centers"} that match ${areaLabel}—either based here or explicitly serving this area. Browse profiles to compare capabilities, then contact shops directly or submit one requirement through IQMotorBase.com.`,
    basedIn > 0
      ? `${basedIn} ${basedIn === 1 ? "shop is based" : "shops are based"} in ${areaLabel}; others appear because their service area includes this location. Look for the “Based in area” or “Serves area” badge on each card.`
      : `Shops shown here list ${areaLabel} in their service coverage. Confirm workshop location and pickup options on each profile before you ship a motor.`,
    rewinding > 0
      ? `${rewinding} ${rewinding === 1 ? "listing mentions" : "listings mention"} rewinding or coil work—open a profile for voltage limits, industries served, and testing scope. Directory listings are not quotes; final pricing comes after inspection.`
      : `Compare each profile for services offered, turnaround, and contact details. Directory listings are not quotes; final pricing comes after inspection.`,
  ];
}

export function buildLocationHowToSteps(areaLabel) {
  return [
    {
      title: "Shortlist shops from the grid",
      body: `Use filters to show shops based in ${areaLabel}, those that serve the area, or capabilities like rewinding, pickup, or rush turnaround.`,
    },
    {
      title: "Open profiles and compare capabilities",
      body: "Each listing links to capacity, certifications, industries served, and contact details—match voltage, HP, and application to the shop’s published scope.",
    },
    {
      title: "Submit one requirement or contact shops",
      body: "Use Submit your requirement / Request quote above, or reach out to shops directly from their profile pages.",
    },
    {
      title: "Use guides for pricing and vetting—not this page",
      body: "For US ballpark pricing use the rewinding cost calculator and cost guide; for shop selection use our how-to-choose checklist—this page stays focused on finding shops in the area.",
    },
  ];
}

export function buildLocationBuyerChecklist() {
  return [
    "Clear nameplate photo (HP/kW, voltage, RPM, frame)",
    "Motor type and application (pump, fan, crane, marine, etc.)",
    "Failure symptoms and urgency",
    "Whether the motor can be shipped or needs on-site / field service",
  ];
}

export function buildLocationFaqItems(areaLabel) {
  return [
    {
      question: `How do I choose a motor repair shop in ${areaLabel}?`,
      answer: `Shortlist two or three listings on this page, open each profile, and compare rewinding scope, testing, turnaround, and warranty. Match shop experience to your voltage, horsepower, and industry. Use our how to choose an electric motor repair shop guide for a full checklist—then insist on written quotes after inspection.`,
    },
    {
      question: `Why does a shop show “Serves area” instead of “Based in area”?`,
      answer: `Some centers operate from another city or country but explicitly list ${areaLabel} in their service coverage. The badge tells you whether the workshop address is in the area or the shop travels / accepts shipped motors from here. Always confirm location and logistics on the profile before authorizing work.`,
    },
    {
      question: "What should I send before requesting a quote?",
      answer:
        "Send nameplate photos, HP or kW, voltage, RPM, frame size, and a short failure description. Note if you need pickup, rush turnaround, or hazardous-location / medium-voltage experience. Shops quote accurately only after they inspect the motor or approve your photos.",
    },
    {
      question: "Is a directory listing the same as a repair quote?",
      answer:
        "No. Listings describe capabilities and contact paths. Ballpark pricing tools and articles on IQMotorBase.com help you budget, but the only reliable price is a written shop quote after inspection.",
    },
    {
      question: `How do I list my motor repair shop in ${areaLabel}?`,
      answer:
        "repair shops can apply for a directory profile on IQMotorBase.com. Complete capacity, services, and coverage fields so buyers filtering this area can find you accurately.",
    },
  ];
}

export function buildLocationGuideLinks() {
  return [
    {
      href: "/electric-motor-rewinding-cost-calculator",
      label: "Rewinding cost calculator",
      hint: "Instant US ballpark by HP and specs",
    },
    {
      href: "/cost-of-motor-repair-and-rewinding",
      label: "Motor rewinding cost guide",
      hint: "HP tables, drivers, and FAQs",
    },
    {
      href: "/how-to-choose-electric-motor-repair-shop",
      label: "How to choose a repair shop",
      hint: "Testing, scope, and red flags",
    },
    {
      href: "/electric-motor-repair-shops-listings",
      label: "Full repair center directory",
      hint: "Search all locations",
    },
  ];
}
