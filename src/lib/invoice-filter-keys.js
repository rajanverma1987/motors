/** Invoice list system filter keys (leaf module — no app imports). */

/** Status filter key for fully paid invoices with sales tax collected. */
export const INVOICE_FILTER_TAX_COLLECTED = "__tax_collected__";

/** Status filter key for billed invoices with sales tax still to be collected. */
export const INVOICE_FILTER_TAX_TO_BE_COLLECTED = "__tax_to_be_collected__";

/** Legacy Simple key — still accepted by list query. */
export const INVOICE_FILTER_TAX_TO_BE_COLLECTED_LEGACY = "__tax_to_collect__";

/** Status filter key for open (not fully paid) invoice balance. */
export const INVOICE_FILTER_AMOUNT_RECEIVABLE = "__amount_receivable__";
