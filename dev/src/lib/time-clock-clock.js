function localDateIso(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar date YYYY-MM-DD in an IANA timezone. */
export function dateIsoInTimeZone(value, timeZone) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const tz = String(timeZone || "").trim();
  if (!tz) return localDateIso(d);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

/** Clock time in a shop IANA timezone. Empty timezone uses the runtime local zone. */
export function formatClockInTimeZone(iso, timeZone) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tz = String(timeZone || "").trim();
  return new Intl.DateTimeFormat("en-US", {
    ...(tz ? { timeZone: tz } : {}),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}
