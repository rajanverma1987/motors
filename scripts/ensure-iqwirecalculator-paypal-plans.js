/**
 * Create or update IQWireCalculator PayPal billing plans:
 *   monthly $11.99 (slug: mobile-app)
 *   yearly  $119   (slug: mobile-app-yearly)
 *
 * Usage (from repo root):
 *   node scripts/ensure-iqwirecalculator-paypal-plans.js
 *
 * Requires MONGODB_URI and PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in .env.local
 */

const path = require("path");
const { createJiti } = require("jiti");

const root = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(root, ".env.local") });
require("dotenv").config({ path: path.join(root, ".env") });

async function main() {
  const jiti = createJiti(__filename, {
    alias: { "@": path.join(root, "src") },
  });
  const { ensureMobileAppBillingPlans } = jiti(
    path.join(root, "src/lib/mobile-app-subscription.js")
  );
  const billing = await ensureMobileAppBillingPlans();
  const monthly = billing.monthly;
  const yearly = billing.yearly;
  console.log("Monthly:", {
    slug: monthly.slug,
    price: monthly.customPrice,
    billingCycle: monthly.billingCycle,
    paypalPlanId: monthly.paypalPlanId || "(not linked)",
    paypalProductId: monthly.paypalProductId || "",
  });
  console.log("Yearly:", {
    slug: yearly.slug,
    price: yearly.customPrice,
    billingCycle: yearly.billingCycle,
    paypalPlanId: yearly.paypalPlanId || "(not linked)",
    paypalProductId: yearly.paypalProductId || "",
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
