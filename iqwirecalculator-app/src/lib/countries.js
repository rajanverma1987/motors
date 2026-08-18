import COUNTRY_ROWS from "./country-data.json";

const BY_CODE = Object.fromEntries(
  (Array.isArray(COUNTRY_ROWS) ? COUNTRY_ROWS : []).map((row) => [
    String(row.code || "").toUpperCase(),
    String(row.name || "").trim(),
  ])
);

export function allCountries() {
  return Object.keys(BY_CODE)
    .filter((code) => code && BY_CODE[code])
    .map((code) => ({ code, name: BY_CODE[code] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function countryNameFromCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return "";
  return BY_CODE[c] || "";
}

export function isValidCountryCode(code) {
  return !!countryNameFromCode(code);
}
