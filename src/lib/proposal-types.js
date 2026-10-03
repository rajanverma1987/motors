/** Simple portal proposal kinds: Sales / Service / Field Service. */

export const PROPOSAL_TYPE_SALES = "sales";
export const PROPOSAL_TYPE_SERVICE = "service";
export const PROPOSAL_TYPE_FIELD_SERVICE = "field_service";

export const PROPOSAL_TYPE_VALUES = [
  PROPOSAL_TYPE_SALES,
  PROPOSAL_TYPE_SERVICE,
  PROPOSAL_TYPE_FIELD_SERVICE,
];

export const PROPOSAL_TYPE_OPTIONS = [
  { value: PROPOSAL_TYPE_SALES, label: "Sales" },
  { value: PROPOSAL_TYPE_SERVICE, label: "Service" },
  { value: PROPOSAL_TYPE_FIELD_SERVICE, label: "Field Service" },
];

/**
 * @param {unknown} raw
 * @returns {"sales"|"service"|"field_service"}
 */
export function normalizeProposalType(raw) {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (t === "sale" || t === "sales") return PROPOSAL_TYPE_SALES;
  if (t === "field" || t === "field_service" || t === "fieldservice") {
    return PROPOSAL_TYPE_FIELD_SERVICE;
  }
  if (t === "repair" || t === "service") return PROPOSAL_TYPE_SERVICE;
  return PROPOSAL_TYPE_SERVICE;
}

export function proposalTypeLabel(raw) {
  const t = normalizeProposalType(raw);
  if (t === PROPOSAL_TYPE_SALES) return "Sales";
  if (t === PROPOSAL_TYPE_FIELD_SERVICE) return "Field Service";
  return "Service";
}

export function proposalTypeBadgeVariant(raw) {
  const t = normalizeProposalType(raw);
  if (t === PROPOSAL_TYPE_SALES) return "primary";
  if (t === PROPOSAL_TYPE_FIELD_SERVICE) return "warning";
  return "default";
}
