/** USD — one-time unlock (consumes 1 credit per price reveal). */
export function calculatorSingleUsePriceUsd() {
  const n = Number(process.env.CALCULATOR_SINGLE_USE_USD ?? 5);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

/** USD / month — fallback display only when SubscriptionPlan slug is missing (prefer DB plan). */
export function calculatorMonthlyPriceUsd() {
  const n = Number(process.env.CALCULATOR_MONTHLY_USD ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function calculatorMonthlyPaypalPlanId() {
  return String(process.env.CALCULATOR_PAYPAL_MONTHLY_PLAN_ID || "").trim();
}

export function calculatorAccessBypassEnabled() {
  return String(process.env.CALCULATOR_ACCESS_BYPASS || "").trim() === "1";
}
