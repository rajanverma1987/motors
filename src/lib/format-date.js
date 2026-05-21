/**
 * Display date as m/d/yyyy (e.g. 5/19/2026).
 * Accepts ISO date strings (YYYY-MM-DD), Date, or timestamp.
 */
export function formatDateMdy(value) {
  if (value == null || value === "") return "—";
  let d = null;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "number") {
    d = new Date(value);
  } else {
    const raw = String(value).trim();
    if (!raw) return "—";
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    } else {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) d = parsed;
    }
  }

  if (!d || Number.isNaN(d.getTime())) return String(value);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}
