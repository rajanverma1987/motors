import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ShopSubscription from "@/models/ShopSubscription";
import CalculatorEntitlement from "@/models/CalculatorEntitlement";
import { CALCULATOR_SUBSCRIPTION_PLAN_SLUG } from "@/lib/calculator-subscription-plan";

/** Admin plan slugs that mean calculators-only portal (not full CRM). */
export const CALCULATOR_ONLY_SHOP_PLAN_SLUGS = new Set([
  CALCULATOR_SUBSCRIPTION_PLAN_SLUG,
  "calculator-only",
]);

/**
 * Calculator-only portal users (signup via calculators flow or shop plan slug calc-only)
 * must pay CalculatorEntitlement before using dashboard tools. Everyone else gets calculators included.
 */
export async function resolveCalculatorPortalTier(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) {
    return {
      calculatorOnlyTier: false,
      fullCrmIncludesCalculators: true,
      shopPlanSlug: "",
    };
  }
  await connectDB();
  const user = await User.findOne({ email })
    .select("calculatorOnlyAccount listingOnlyAccount")
    .lean();
  const sub = await ShopSubscription.findOne({ ownerEmail: email })
    .populate("planId", "slug")
    .lean();
  const shopPlanSlug = String(sub?.planId?.slug || "").trim().toLowerCase();
  const planIsCalculatorOnly = CALCULATOR_ONLY_SHOP_PLAN_SLUGS.has(shopPlanSlug);

  let calculatorOnlyTier =
    user?.calculatorOnlyAccount === true || planIsCalculatorOnly;

  if (!calculatorOnlyTier && !user?.listingOnlyAccount && !sub) {
    const entitlement = await CalculatorEntitlement.findOne({ ownerEmail: email })
      .select("_id")
      .lean();
    if (entitlement) {
      calculatorOnlyTier = true;
      if (user && user.calculatorOnlyAccount !== true) {
        await User.updateOne({ email }, { $set: { calculatorOnlyAccount: true } });
      }
    }
  }

  return {
    calculatorOnlyTier,
    fullCrmIncludesCalculators: !calculatorOnlyTier,
    shopPlanSlug,
  };
}

export async function userIsCalculatorOnlyPortalAccount(ownerEmail) {
  const tier = await resolveCalculatorPortalTier(ownerEmail);
  return tier.calculatorOnlyTier;
}
