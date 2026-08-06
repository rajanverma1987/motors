/**
 * Calendar date helpers for UI and document prints.
 * Accepts ISO date strings (YYYY-MM-DD), Date, or timestamp.
 */

/** Settings currency → typical country date locale. */
const CURRENCY_DATE_LOCALE = {
  USD: "en-US",
  CAD: "en-CA",
  MXN: "es-MX",
  GBP: "en-GB",
  EUR: "en-GB",
  INR: "en-IN",
  AUD: "en-AU",
  NZD: "en-NZ",
  SGD: "en-SG",
  HKD: "en-HK",
  JPY: "ja-JP",
  CNY: "zh-CN",
  BRL: "pt-BR",
  CHF: "de-CH",
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  PLN: "pl-PL",
  ZAR: "en-ZA",
  AED: "en-AE",
};

/**
 * @param {string|null|undefined} currencyCode
 * @returns {string|undefined} BCP 47 locale
 */
export function dateLocaleFromCurrency(currencyCode) {
  const code = String(currencyCode || "")
    .toUpperCase()
    .trim();
  return CURRENCY_DATE_LOCALE[code] || undefined;
}

/**
 * Parse a calendar date without UTC day-shift for YYYY-MM-DD.
 * @returns {Date|null}
 */
export function parseCalendarDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value).trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Display date as m/d/yyyy (e.g. 5/19/2026). Legacy US-style helper for tables.
 */
export function formatDateMdy(value) {
  const d = parseCalendarDate(value);
  if (!d) {
    if (value == null || value === "") return "-";
    return String(value);
  }
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * Format a date for a locale (country-style short date).
 * @param {unknown} value
 * @param {string} [locale] BCP 47; omit for runtime default
 */
export function formatDateLocale(value, locale) {
  const d = parseCalendarDate(value);
  if (!d) {
    if (value == null || value === "") return "-";
    return String(value);
  }
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return formatDateMdy(value);
  }
}

/**
 * Format a date using the shop currency’s typical country locale.
 * @param {unknown} value
 * @param {string} [currencyCode]
 */
export function formatDateForCurrency(value, currencyCode) {
  return formatDateLocale(value, dateLocaleFromCurrency(currencyCode));
}
