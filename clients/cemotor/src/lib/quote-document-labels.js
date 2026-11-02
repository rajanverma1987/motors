import {
  normalizeProposalType,
  PROPOSAL_TYPE_FIELD_SERVICE,
  PROPOSAL_TYPE_SALES,
} from "@/lib/proposal-types";

/** Customer-facing title for CRM RFQs (print, preview, modals, emails). Default = Service. */
export const SERVICE_PROPOSAL_DOCUMENT_TITLE = "Service Proposal";

/** Sentence-case variant for section headings and toasts. */
export const SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER = "service proposal";

/**
 * Customer-facing proposal title from proposalType (Sales / Service / Field Service).
 * @param {unknown} proposalType
 */
export function proposalDocumentTitle(proposalType) {
  const t = normalizeProposalType(proposalType);
  if (t === PROPOSAL_TYPE_SALES) return "Sales Proposal";
  if (t === PROPOSAL_TYPE_FIELD_SERVICE) return "Field Service Proposal";
  return SERVICE_PROPOSAL_DOCUMENT_TITLE;
}

/** Sentence-case / email wording. */
export function proposalDocumentTitleLower(proposalType) {
  return proposalDocumentTitle(proposalType).toLowerCase();
}
