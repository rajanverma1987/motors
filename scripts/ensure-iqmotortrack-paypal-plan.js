/**
 * Create or update IQMotorTrack Pro PayPal billing plan: $49/month (slug: iqmotortrack-pro)
 *
 * Usage:
 *   node scripts/ensure-iqmotortrack-paypal-plan.js
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
  const { ensureTrackBillingPlan } = jiti(path.join(root, "src/lib/track-subscription.js"));
  const plan = await ensureTrackBillingPlan();
  console.log("IQMotorTrack Pro:", plan);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
