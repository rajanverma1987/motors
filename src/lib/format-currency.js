/** ISO 4217 codes shown in Settings (extend as needed). */
export const DISPLAY_CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "INR", label: "Indian Rupee (INR)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
  { value: "CNY", label: "Chinese Yuan (CNY)" },
  { value: "MXN", label: "Mexican Peso (MXN)" },
  { value: "BRL", label: "Brazilian Real (BRL)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
  { value: "SEK", label: "Swedish Krona (SEK)" },
  { value: "NOK", label: "Norwegian Krone (NOK)" },
  { value: "DKK", label: "Danish Krone (DKK)" },
  { value: "PLN", label: "Polish Złoty (PLN)" },
  { value: "SGD", label: "Singapore Dollar (SGD)" },
  { value: "HKD", label: "Hong Kong Dollar (HKD)" },
  { value: "NZD", label: "New Zealand Dollar (NZD)" },
  { value: "ZAR", label: "South African Rand (ZAR)" },
  { value: "AED", label: "UAE Dirham (AED)" },
];

const ALLOWED = new Set(DISPLAY_CURRENCIES.map((c) => c.value));

/** Use narrow $ (not US$, CA$, etc.) for these ISO codes in the UI */
const DOLLAR_NARROW_SYMBOL = new Set([
  "USD",
  "CAD",
  "AUD",
  "SGD",
  "HKD",
  "NZD",
  "MXN",
]);

function currencyFormatOptions(safeCode, fractionDigits) {
  const opts = {
    style: "currency",
    currency: safeCode,
  };
  if (DOLLAR_NARROW_SYMBOL.has(safeCode)) {
    opts.currencyDisplay = "narrowSymbol";
  }
  if (fractionDigits != null) {
    opts.minimumFractionDigits = fractionDigits;
    opts.maximumFractionDigits = fractionDigits;
  }
  return opts;
}

export function isAllowedCurrency(code) {
  return typeof code === "string" && ALLOWED.has(code.toUpperCase().trim());
}

/**
 * Format a numeric amount for display. Accepts number or numeric string.
 * @param {string|number|null|undefined} value
 * @param {string} currencyCode ISO 4217
 */
export function formatMoney(value, currencyCode = "USD") {
  const code = (currencyCode || "USD").toUpperCase();
  const safeCode = ALLOWED.has(code) ? code : "USD";
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value ?? "").replace(/,/g, "").replace(/^\s*\$\s*/, ""));
  if (!Number.isFinite(n)) return "—";
  /** en-IN uses Indian digit grouping (lakhs/crores), e.g. ₹1,00,000.00 */
  const locale = safeCode === "INR" ? "en-IN" : undefined;
  try {
    return new Intl.NumberFormat(
      locale,
      currencyFormatOptions(safeCode)
    ).format(n);
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(n);
  }
}

/** JPY-style currencies often use 0 decimal places in UI */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND"]);

export function formatMoneyCompact(value, currencyCode = "USD") {
  const code = (currencyCode || "USD").toUpperCase();
  const safeCode = ALLOWED.has(code) ? code : "USD";
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return "—";
  const fraction = ZERO_DECIMAL.has(safeCode) ? 0 : 2;
  const locale = safeCode === "INR" ? "en-IN" : undefined;
  try {
    return new Intl.NumberFormat(
      locale,
      currencyFormatOptions(safeCode, fraction)
    ).format(n);
  } catch {
    return formatMoney(value, "USD");
  }
}
