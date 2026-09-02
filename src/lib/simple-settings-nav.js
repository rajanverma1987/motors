/** Simple `/dashboards/settings` side-menu sections. */

export const SIMPLE_SETTINGS_PATH = "/dashboards/settings";

export const SIMPLE_SETTINGS_SECTIONS = [
  { id: "account", label: "Account" },
  { id: "branding", label: "Branding" },
  { id: "display", label: "Display" },
  { id: "accounts", label: "Accounts" },
  { id: "status", label: "Status" },
  { id: "product-dropdowns", label: "Dropdowns" },
  { id: "inventory", label: "Inventory" },
  { id: "smtp", label: "Email Settings" },
  { id: "master", label: "Master" },
  { id: "job-board", label: "Shop Floor Job Board" },
  { id: "directory-listing", label: "Directory Listing" },
  { id: "marketplace", label: "Marketplace" },
  { id: "job-postings", label: "Job Postings" },
  { id: "access-controls", label: "Access Controls" },
  { id: "data-upload", label: "Data Upload" },
  { id: "api-integration", label: "API Integration" },
  { id: "subscription", label: "Subscription" },
  { id: "support", label: "Support" },
];

export const SIMPLE_SETTINGS_SECTION_IDS = SIMPLE_SETTINGS_SECTIONS.map((s) => s.id);

/** Sections that use the shared settings draft + sticky Save bar. */
export const SIMPLE_SETTINGS_DRAFT_SECTION_IDS = new Set([
  "account",
  "branding",
  "display",
  "accounts",
  "status",
  "product-dropdowns",
  "inventory",
  "smtp",
]);

export const SIMPLE_MASTER_TABS = [
  { id: "vendors", label: "Vendors" },
  { id: "sales-persons", label: "Sales Persons" },
];

export const SIMPLE_MASTER_TAB_IDS = SIMPLE_MASTER_TABS.map((t) => t.id);

/**
 * @param {string | null | undefined} section
 */
export function resolveSimpleSettingsSection(section) {
  const raw = String(section || "").trim();
  const id = raw === "dropdowns" ? "status" : raw;
  return SIMPLE_SETTINGS_SECTION_IDS.includes(id) ? id : "account";
}

/**
 * @param {string | null | undefined} tab
 */
export function resolveSimpleMasterTab(tab) {
  const id = String(tab || "").trim();
  // Legacy masterTab=employees moved to /dashboards/employees
  if (id === "employees") return "vendors";
  return SIMPLE_MASTER_TAB_IDS.includes(id) ? id : "vendors";
}

/**
 * @param {string} section
 * @param {Record<string, string>} [extra]
 */
export function simpleSettingsHref(section, extra = {}) {
  const params = new URLSearchParams();
  params.set("section", resolveSimpleSettingsSection(section));
  for (const [key, value] of Object.entries(extra || {})) {
    const v = String(value ?? "").trim();
    if (key && v) params.set(key, v);
  }
  return `${SIMPLE_SETTINGS_PATH}?${params.toString()}`;
}
