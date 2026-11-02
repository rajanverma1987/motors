/**
 * Grace period in days from invoice date before an open balance counts as "overdue"
 * (matches Settings → Accounts → Default payment terms).
 */
export function graceDaysFromAccountsPaymentTermsSlug(slug) {
  const s = String(slug ?? "net30").toLowerCase().trim();
  if (s === "on_receipt") return 0;
  if (s === "net15") return 15;
  if (s === "net30") return 30;
  if (s === "net45") return 45;
  if (s === "net60") return 60;
  return 30;
}

/** Open invoice is overdue vs terms: days since invoice date exceeds grace. */
export function isOpenInvoiceOverdueForTerms(daysOutstanding, accountsPaymentTermsSlug) {
  if (daysOutstanding == null || daysOutstanding < 0) return false;
  const g = graceDaysFromAccountsPaymentTermsSlug(accountsPaymentTermsSlug);
  return daysOutstanding > g;
}
