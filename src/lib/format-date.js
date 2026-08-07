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

const DATE_FORMAT_OPTS = { day: "2-digit", month: "2-digit", year: "numeric" };

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
 * Day/month/year order for a locale (from Intl formatToParts).
 * @param {string} [locale]
 * @returns {("day"|"month"|"year")[]}
 */
export function datePartOrderForLocale(locale) {
  try {
    const parts = new Intl.DateTimeFormat(locale || undefined, DATE_FORMAT_OPTS).formatToParts(
      new Date(2024, 0, 2)
    );
    const order = parts
      .filter((p) => p.type === "day" || p.type === "month" || p.type === "year")
      .map((p) => p.type);
    if (order.length === 3) return order;
  } catch {
    /* fall through */
  }
  return ["month", "day", "year"];
}

/**
 * Placeholder like mm/dd/yyyy or dd/mm/yyyy for locale-styled date text inputs.
 * @param {string} [locale]
 */
export function dateInputPlaceholderForLocale(locale) {
  const sep =
    (() => {
      try {
        const lit = new Intl.DateTimeFormat(locale || undefined, DATE_FORMAT_OPTS)
          .formatToParts(new Date(2024, 0, 2))
          .find((p) => p.type === "literal");
        return lit?.value || "/";
      } catch {
        return "/";
      }
    })() || "/";
  const token = { day: "dd", month: "mm", year: "yyyy" };
  return datePartOrderForLocale(locale)
    .map((p) => token[p])
    .join(sep);
}

/**
 * Build a local Date from y/m/d parts when valid.
 * @returns {Date|null}
 */
function dateFromParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/**
 * Parse numeric slash/dot/dash dates using locale part order when ambiguous.
 * @param {string} raw
 * @param {string} [locale]
 * @returns {Date|null}
 */
function parseNumericDateString(raw, locale) {
  const m = String(raw || "")
    .trim()
    .match(/^(\d{1,4})[./\-](\d{1,2})[./\-](\d{1,4})$/);
  if (!m) return null;
  let a = Number(m[1]);
  let b = Number(m[2]);
  let c = Number(m[3]);

  // YMD: 2026-08-07 or 2026/08/07
  if (String(m[1]).length === 4) {
    return dateFromParts(a, b, c);
  }

  // Expand 2-digit year on the last segment
  if (String(m[3]).length <= 2) {
    c += c >= 70 ? 1900 : 2000;
  } else if (String(m[3]).length !== 4) {
    return null;
  }

  const order = datePartOrderForLocale(locale);
  const vals = [a, b, c];
  const map = { day: 0, month: 0, year: 0 };
  order.forEach((part, i) => {
    map[part] = vals[i];
  });

  // Disambiguate when locale order would produce an impossible month
  if (map.month > 12 && map.day >= 1 && map.day <= 12) {
    const tmp = map.month;
    map.month = map.day;
    map.day = tmp;
  }

  return dateFromParts(map.year, map.month, map.day);
}

/**
 * Parse a calendar date without UTC day-shift for YYYY-MM-DD.
 * @param {unknown} value
 * @param {{ locale?: string }} [options]
 * @returns {Date|null}
 */
export function parseCalendarDate(value, options = {}) {
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
    return dateFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const numeric = parseNumericDateString(raw, options.locale);
  if (numeric) return numeric;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Normalize any parseable date to `YYYY-MM-DD` for URL/query and `<input type="date">`.
 * @param {unknown} value
 * @param {{ locale?: string }} [options]
 * @returns {string}
 */
export function toInputDateValue(value, options = {}) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // BSON calendar dates are stored at UTC noon — prefer UTC parts so TZ never shifts the day.
    if (value.getUTCHours() === 12 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0) {
      const y = value.getUTCFullYear();
      const m = String(value.getUTCMonth() + 1).padStart(2, "0");
      const day = String(value.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  const d = parseCalendarDate(value, options);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Persist a calendar day as BSON Date at UTC noon (avoids TZ day-shift).
 * Empty / unparseable → null (clears the field).
 * @param {unknown} value
 * @param {{ locale?: string }} [options]
 * @returns {Date|null}
 */
export function toMongoCalendarDate(value, options = {}) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const ymd = toInputDateValue(value, options);
    if (!ymd) return null;
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  }
  const ymd = toInputDateValue(value, options);
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/**
 * Mongo `$gte` / `$lte` bounds for calendar-day Date fields (inclusive).
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {{ $gte?: Date, $lte?: Date } | null}
 */
export function mongoCalendarDateRange(fromYmd, toYmd) {
  const from = toInputDateValue(fromYmd);
  const to = toInputDateValue(toYmd);
  if (!from && !to) return null;
  if (from && to && from > to) return null;
  /** @type {{ $gte?: Date, $lte?: Date }} */
  const range = {};
  if (from) {
    const [y, m, d] = from.split("-").map(Number);
    range.$gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  if (to) {
    const [y, m, d] = to.split("-").map(Number);
    range.$lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  return range;
}

/**
 * Parse a locale-styled date typed in a filter (e.g. 07/08/2026) to YYYY-MM-DD.
 * @param {unknown} value
 * @param {string} [locale]
 */
export function parseLocaleDateInput(value, locale) {
  return toInputDateValue(value, { locale });
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
  const d = parseCalendarDate(value, { locale });
  if (!d) {
    if (value == null || value === "") return "-";
    return String(value);
  }
  try {
    return new Intl.DateTimeFormat(locale || undefined, DATE_FORMAT_OPTS).format(d);
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
