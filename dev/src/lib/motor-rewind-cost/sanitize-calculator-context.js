const ALLOWED_KEYS = new Set([
  "ratingUnit",
  "hp",
  "kw",
  "phase",
  "voltage",
  "rpm",
  "slots",
  "coilType",
  "wireGauge",
  "manualCuKg",
  "insulationMode",
  "insulationValue",
  "copperRatePerKg",
]);

/**
 * @param {unknown} raw
 * @returns {{ form: Record<string, string>, sourcePage: string } | null}
 */
export function sanitizeCalculatorContext(raw) {
  if (!raw || typeof raw !== "object") return null;
  const formRaw = raw.form;
  if (!formRaw || typeof formRaw !== "object") return null;
  const form = {};
  for (const k of ALLOWED_KEYS) {
    if (formRaw[k] == null || formRaw[k] === "") continue;
    form[k] = String(formRaw[k]).trim().slice(0, 96);
  }
  const sourcePage = String(raw.sourcePage || "").trim().slice(0, 240);
  const probe = JSON.stringify({ form, sourcePage });
  if (probe.length > 20000) return null;
  if (!form.slots || !form.wireGauge) return null;
  const ru = form.ratingUnit === "kw" ? "kw" : "hp";
  const hasHp = form.hp && String(form.hp).trim().length > 0;
  const hasKw = form.kw && String(form.kw).trim().length > 0;
  if (ru === "kw" && !hasKw) return null;
  if (ru !== "kw" && !hasHp) return null;
  return { form: { ...form, ratingUnit: ru }, sourcePage };
}
