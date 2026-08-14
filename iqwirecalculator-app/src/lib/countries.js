import { getData, getName } from "country-list";

export function allCountries() {
  return getData()
    .map((c) => ({
      code: String(c.code || "").toUpperCase(),
      name: String(c.name || "").trim(),
    }))
    .filter((c) => c.code && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function countryNameFromCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return "";
  return getName(c) || "";
}

export function isValidCountryCode(code) {
  return !!countryNameFromCode(code);
}
