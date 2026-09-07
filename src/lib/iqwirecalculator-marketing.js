/** Keep in sync with `MOBILE_APP_TRIAL_DAYS` / `MOBILE_APP_DEFAULT_*_USD` in mobile-app-subscription.js */
export const IQWIRECALCULATOR_PATH = "/iqwirecalculator";
export const IQWIRECALCULATOR_APP_PATH = "/iqwire";
export const IQWIRECALCULATOR_SUPPORT_PATH = "/support";
export const IQWIRECALCULATOR_PRIVACY_PATH = "/iqwirecalculator/privacy";
export const IQWIRECALCULATOR_PRIVACY_CHOICES_PATH = "/iqwirecalculator/privacy-choices";
export const IQWIRECALCULATOR_SUPPORT_EMAIL = "contact@IQMotorBase.com";
export const IQWIRECALCULATOR_MONTHLY_USD = 11.99;
export const IQWIRECALCULATOR_YEARLY_USD = 119;
export const IQWIRECALCULATOR_TRIAL_DAYS = 3;

export const IQWIRECALCULATOR_PAGE_TITLE = "IQWireCalculator | Circular Mils & Wire Substitution App";
export const IQWIRECALCULATOR_META_DESCRIPTION =
  "Find the right parallel wire mix in seconds. CM Best Match calculates circular mils substitutions for motor rewinds. Install the free PWA, try 3 days, then $11.99/mo or $119/year.";

export const IQWIRECALCULATOR_FAQS = [
  {
    question: "What is circular mils (CM) and why does it matter for rewinds?",
    answer:
      "Circular mils measure the cross-sectional area of round magnet wire. Rewinders care about total CM of a path: each size’s CM times how many strands you put in hand. That total is the copper area carrying current. When you parallel mixed gauges, you add those products together and compare them to a target CM from takeoff or a voltage change.",
  },
  {
    question: "Can I add my shop’s custom or half wire sizes?",
    answer:
      "Yes. IQWireCalculator ships with a common copper AWG table (24 through 8). You can add custom labels and circular mils, half sizes like 18.5 included, up to 100 extra sizes on your account. Default AWG sizes stay. You only delete what you added.",
  },
  {
    question: "Does this replace engineering judgment on slot fill or insulation?",
    answer:
      "No. CM Best Match is a planning aid. It finds parallel mixes within ±5% of your target circular mils from the sizes you select. It does not check slot fill, insulation class, temperature rise, nameplate FLA, or electrical code. A senior winder still picks the row and signs off the traveler.",
  },
  {
    question: "How much does it cost after the free trial?",
    answer: `After a ${IQWIRECALCULATOR_TRIAL_DAYS}-day free trial, IQWireCalculator is $${IQWIRECALCULATOR_MONTHLY_USD.toFixed(2)} per month or $${IQWIRECALCULATOR_YEARLY_USD.toFixed(2)} per year, billed through PayPal. That includes the CM Best Match calculator, named saves, and print or email. Cancel anytime from Profile.`,
  },
  {
    question: "How do I install the app on my phone?",
    answer:
      "Open iqmotorbase.com/iqwire in Safari (iPhone) or Chrome (Android). On iPhone, tap Share, then Add to Home Screen. On Android, tap the browser menu, then Install app or Add to Home Screen. You can also scan the QR code on this page. After install it opens full screen like a native app.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Custom wire sizes are cached on the device after you sign in, so the catalog can still appear if the network drops. Calculating a mix does not need the server. Saving a named run, syncing custom sizes to your account, and emailing results need a connection.",
  },
  {
    question: "Is this the same tool used in IQMotorBase’s shop dashboard?",
    answer:
      "Same core CM Best Match math: closest mixes first, up to three distinct sizes. IQWireCalculator is the standalone phone app with a built-in AWG table plus your custom sizes, save, print, and email. Shops on IQMotorBase also have CM Best Match in the dashboard calculators.",
  },
];
