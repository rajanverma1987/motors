/**
 * Master Data Search — wildcard criteria → Mongo $regex helpers.
 * Patterns: exact "text", prefix "text*", suffix "*text", contains "*text*".
 */

import {
  MASTER_DATA_SEARCH_FORMS,
  flattenDatasheetFieldColumns,
} from "@/lib/simple-datasheet-form";

export function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Convert a user search pattern to a case-insensitive anchored regex source.
 * @param {string} raw
 * @returns {string|null} regex source or null if empty
 */
export function wildcardPatternToRegexSource(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (!s.includes("*")) {
    return `^${escapeRegex(s)}$`;
  }
  let out = "";
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === "*") out += ".*";
    else out += escapeRegex(c);
  }
  return `^${out}$`;
}

/**
 * @param {string} formId
 * @param {Record<string, Record<string, string>>} criteriaByBlock
 *   e.g. { dataSheet: { hp: "10*" }, fieldFrame: { make: "ABB" } }
 * @returns {{ path: string, label: string, blockId: string, fieldKey: string, pattern: string, regexSource: string }[]}
 */
export function collectFilledMasterDataCriteria(formId, criteriaByBlock) {
  const form = MASTER_DATA_SEARCH_FORMS[formId];
  if (!form) return [];
  const filled = [];
  for (const block of form.blocks) {
    const map = criteriaByBlock?.[block.id] || {};
    const fields = flattenDatasheetFieldColumns(block.columns);
    for (const field of fields) {
      const pattern = String(map[field.key] ?? "").trim();
      if (!pattern) continue;
      const regexSource = wildcardPatternToRegexSource(pattern);
      if (!regexSource) continue;
      const multiBlock = form.blocks.length > 1;
      filled.push({
        path: `${block.mongoPrefix}.${field.key}`,
        label: multiBlock ? `${field.label} (${block.label})` : field.label,
        blockId: block.id,
        fieldKey: field.key,
        pattern,
        regexSource,
      });
    }
  }
  return filled;
}

/**
 * Customer tab criteria (company, contact name, RFQ/Job/Invoice # wildcards).
 * @param {Record<string, string>} criteria
 */
export function collectCustomerSearchCriteria(criteria) {
  const form = MASTER_DATA_SEARCH_FORMS.customer;
  if (!form?.fields) return [];
  const map = criteria && typeof criteria === "object" ? criteria : {};
  const filled = [];
  for (const field of form.fields) {
    const pattern = String(map[field.key] ?? "").trim();
    if (!pattern) continue;
    const regexSource = wildcardPatternToRegexSource(pattern);
    if (!regexSource) continue;
    filled.push({
      fieldKey: field.key,
      label: field.label,
      pattern,
      regexSource,
    });
  }
  return filled;
}

/**
 * Build Mongo filter clauses for filled criteria (AND).
 * @param {ReturnType<typeof collectFilledMasterDataCriteria>} filled
 */
export function buildMasterDataSearchAndClauses(filled) {
  return filled.map((c) => ({
    [c.path]: { $regex: c.regexSource, $options: "i" },
  }));
}

/**
 * Read a dotted path from a plain object.
 * @param {object} doc
 * @param {string} path
 */
export function getDottedValue(doc, path) {
  return String(path || "")
    .split(".")
    .reduce((o, k) => (o == null ? undefined : o[k]), doc);
}
