/** Keep in sync with `MOBILE_APP_TRIAL_DAYS` / `MOBILE_APP_DEFAULT_MONTHLY_USD` in mobile-app-subscription.js */
export const IQWIRECALCULATOR_PATH = "/iqwirecalculator";
export const IQWIRECALCULATOR_SUPPORT_PATH = "/support";
export const IQWIRECALCULATOR_SUPPORT_EMAIL = "contact@IQMotorBase.com";
export const IQWIRECALCULATOR_MONTHLY_USD = 9.99;
export const IQWIRECALCULATOR_TRIAL_DAYS = 3;

/** Set when store listings are live. Empty string = do not invent a store URL. */
export const IQWIRECALCULATOR_APP_STORE_URL = String(
  process.env.NEXT_PUBLIC_IQWIRECALCULATOR_APP_STORE_URL || ""
).trim();
export const IQWIRECALCULATOR_PLAY_STORE_URL = String(
  process.env.NEXT_PUBLIC_IQWIRECALCULATOR_PLAY_STORE_URL || ""
).trim();

export const IQWIRECALCULATOR_PAGE_TITLE = "IQWireCalculator — Circular Mils & Wire Substitution App";
export const IQWIRECALCULATOR_META_DESCRIPTION =
  "Find the right parallel wire mix in seconds. CM Best Match calculates circular mils substitutions for motor rewinds. Try free, then $9.99/mo.";

export const IQWIRECALCULATOR_FAQS = [
  {
    question: "What is circular mils (CM) and why does it matter for rewinds?",
    answer:
      "Circular mils measure the cross-sectional area of round magnet wire. Rewinders care about total CM of a path: each size’s CM times how many strands you put in hand. That total is the copper area carrying current. When you parallel mixed gauges, you add those products together and compare them to a target CM from takeoff or a voltage change.",
  },
  {
    question: "Can I add my shop’s custom or half wire sizes?",
    answer:
      "Yes. IQWireCalculator ships with a common copper AWG table (24 through 8). You can add custom labels and circular mils—half sizes like 18.5 included—up to 100 extra sizes on your account. Default AWG sizes stay; you only delete what you added.",
  },
  {
    question: "Does this replace engineering judgment on slot fill or insulation?",
    answer:
      "No. CM Best Match is a planning aid. It finds parallel mixes within ±10% of your target circular mils from the sizes you select. It does not check slot fill, insulation class, temperature rise, nameplate FLA, or electrical code. A senior winder still picks the row and signs off the traveler.",
  },
  {
    question: "How much does it cost after the free trial?",
    answer: `After a ${IQWIRECALCULATOR_TRIAL_DAYS}-day free trial, IQWireCalculator is $${IQWIRECALCULATOR_MONTHLY_USD.toFixed(2)} per month. That includes the CM Best Match calculator, named saves, and print or email from your phone. Cancel anytime. There is no annual plan.`,
  },
  {
    question: "Does it work offline?",
    answer:
      "Custom wire sizes are cached on the device after you sign in, so the catalog can still appear if the network drops. Calculating a mix does not need the server. Saving a named run, syncing custom sizes to your account, and emailing a PDF need a connection.",
  },
  {
    question: "Is this the same tool used in IQMotorBase’s shop dashboard?",
    answer:
      "Same core CM Best Match math: ±10% of target, up to three distinct sizes, ranked closest first. IQWireCalculator is the standalone phone app with a built-in AWG table plus your custom sizes, save, print, and email. Shops on IQMotorBase also have CM Best Match in the dashboard and a technician app that uses the shop’s CRM wire catalog.",
  },
  {
    question: "Who is IQWireCalculator for versus the IQMotorBase technician app?",
    answer:
      "Independent rewinders and small shops that need a wire substitution calculator on the phone without a full CRM. If your shop already runs IQMotorBase, floor techs can use the technician app against the shop catalog instead. Both exist so you are not forced into the wrong product.",
  },
];
