import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import {
  calculatorMonthlyPaypalPlanId,
  calculatorMonthlyPriceUsd,
  calculatorSingleUsePriceUsd,
} from "@/lib/calculator-pricing";
import { createPaypalProductAndPlan, paypalConfigured } from "@/lib/paypal-api";

/** Default slug for the calculators-only PayPal plan in Admin → Subscription plans. */
export const CALCULATOR_SUBSCRIPTION_PLAN_SLUG = "calc-only";

function planSlugFromEnv() {
  return String(process.env.CALCULATOR_SUBSCRIPTION_PLAN_SLUG || CALCULATOR_SUBSCRIPTION_PLAN_SLUG)
    .trim()
    .toLowerCase();
}

/**
 * If Admin created a PayPal plan row without credentials, create PayPal catalog + billing plan on first use.
 */
async function ensureCalculatorPaypalPlanSynced(slug) {
  if (!paypalConfigured()) return null;
  const plan = await SubscriptionPlan.findOne({ slug, active: true });
  if (!plan || plan.planType !== "paypal") return plan;
  if (String(plan.paypalPlanId || "").trim()) return plan;
  const price = Number(plan.customPrice);
  if (!Number.isFinite(price) || price <= 0) return plan;
  try {
    const { paypalProductId, paypalPlanId } = await createPaypalProductAndPlan(plan);
    plan.paypalProductId = paypalProductId;
    plan.paypalPlanId = paypalPlanId;
    await plan.save();
    return plan;
  } catch (err) {
    console.warn("ensureCalculatorPaypalPlanSynced:", err.message);
    return plan;
  }
}

async function findCalculatorPlanDoc(slug) {
  await connectDB();
  let plan = await SubscriptionPlan.findOne({ slug, active: true }).lean();
  if (!plan) plan = await SubscriptionPlan.findOne({ slug }).lean();
  return plan;
}

/**
 * Resolve calculators subscription from SubscriptionPlan slug (calc-only) or env fallback.
 * @returns {Promise<{
 *   configured: boolean,
 *   paypalPlanId: string,
 *   monthlyUsd: number,
 *   currency: string,
 *   planName: string,
 *   planSlug: string,
 *   planFound: boolean,
 *   planType: string,
 *   source: 'db' | 'env' | 'default'
 * }>}
 */
export async function getCalculatorSubscriptionPlan() {
  const slug = planSlugFromEnv();
  let monthlyUsd = calculatorMonthlyPriceUsd();
  let currency = "USD";
  let paypalPlanId = "";
  let planName = "Calculators";
  let planFound = false;
  let planType = "";
  let source = "default";

  try {
    await ensureCalculatorPaypalPlanSynced(slug);
    const plan = await findCalculatorPlanDoc(slug);
    if (plan) {
      planFound = true;
      planType = plan.planType || "";
      planName = plan.name || planName;
      const price = Number(plan.customPrice);
      if (Number.isFinite(price)) monthlyUsd = price;
      if (plan.currency) currency = String(plan.currency).toUpperCase();
      const dbPaypalId = String(plan.paypalPlanId || "").trim();
      if (dbPaypalId) {
        paypalPlanId = dbPaypalId;
        source = "db";
      }
    }
  } catch (err) {
    console.warn("getCalculatorSubscriptionPlan DB lookup failed:", err.message);
  }

  if (!paypalPlanId) {
    const envId = calculatorMonthlyPaypalPlanId();
    if (envId) {
      paypalPlanId = envId;
      source = source === "db" ? "db" : "env";
    }
  }

  if (monthlyUsd <= 0) {
    const envMonthly = calculatorMonthlyPriceUsd();
    if (envMonthly > 0) monthlyUsd = envMonthly;
  }

  return {
    configured: !!paypalPlanId && monthlyUsd > 0,
    paypalPlanId,
    monthlyUsd,
    currency,
    planName,
    planSlug: slug,
    planFound,
    planType,
    source,
  };
}

/** Pricing payload for calculator paywall / access API (includes single-use + PayPal flags). */
export async function buildCalculatorPricingPayload() {
  const calcPlan = await getCalculatorSubscriptionPlan();
  return {
    singleUseUsd: calculatorSingleUsePriceUsd(),
    monthlyUsd: calcPlan.monthlyUsd,
    monthlyPlanName: calcPlan.planName,
    monthlyPlanSlug: calcPlan.planSlug,
    currency: calcPlan.currency,
    paypalConfigured: paypalConfigured(),
    monthlyPlanConfigured: calcPlan.configured,
    planFound: calcPlan.planFound,
    planType: calcPlan.planType,
  };
}
