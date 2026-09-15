/** IQMotorTrack marketing + app path constants. */

export const IQMOTORTRACK_APP_PATH = "/Track";
export const IQMOTORTRACK_MARKETING_PATH = "/motor-maintenance-and-repair";
export const IQMOTORTRACK_MONTHLY_USD = 49;
export const IQMOTORTRACK_FREE_MOTOR_LIMIT = 5;
export const IQMOTORTRACK_PAGE_TITLE =
  "Motor Maintenance and Repair Software for Plants | IQMotorTrack";
export const IQMOTORTRACK_META_DESCRIPTION =
  "Motor maintenance and repair tracking for plant managers. Register every electric motor, log service history, and send multi-shop RFQs when a motor goes down. Free for up to 5 motors. Pro $49/month.";

export const IQMOTORTRACK_KEYWORDS = [
  "motor maintenance and repair",
  "plant motor maintenance software",
  "electric motor asset management",
  "motor repair RFQ",
  "facility motor tracking",
  "industrial motor maintenance app",
  "motor down work order",
  "IQMotorTrack",
];

export const IQMOTORTRACK_PLANT_MANAGER_BENEFITS = [
  {
    title: "One register for every motor",
    body: "Nameplate data, location, criticality, and photos in one place. Stop hunting binders and shared drives when a line goes down.",
  },
  {
    title: "Service history that travels with the asset",
    body: "See which shop rewound it, what it cost, and what they found. Award the next job with full context, not memory.",
  },
  {
    title: "Motor down to shop RFQ in one flow",
    body: "Mark a motor down, pick repair shops, and send an RFQ with the motor datasheet already attached. Compare proposals side by side.",
  },
  {
    title: "Technical data that compounds",
    body: "Winding and test data from the awarded shop flows back into your motor record so the next repair starts with a complete datasheet.",
  },
  {
    title: "Clear spend and accountability",
    body: "Maintenance logs and repair totals per motor help you justify spare strategy and show leadership where downtime risk sits.",
  },
  {
    title: "Works on the floor",
    body: "Install as a phone app from the browser. No App Store account. Scan a QR on the marketing page and open IQMotorTrack on mobile.",
  },
];

export const IQMOTORTRACK_OTHER_USER_BENEFITS = [
  {
    role: "Maintenance supervisors",
    body: "See overdue and due-soon work, update status in the field, and keep location and asset tags accurate without a desktop login.",
  },
  {
    role: "Reliability engineers",
    body: "Keep criticality and nameplate truth current. Use service history to spot repeat failures before the next outage.",
  },
  {
    role: "Plant buyers / procurement",
    body: "Compare multi-shop proposals on the same motor. Award with a clear paper trail instead of scattered emails.",
  },
  {
    role: "Technicians on shift",
    body: "Open the motor record at the asset, log what was done, and leave notes the next shift can trust.",
  },
];

export const IQMOTORTRACK_FAQS = [
  {
    question: "What is IQMotorTrack?",
    answer:
      "IQMotorTrack is motor maintenance and repair software for plants and facilities. It is the plant’s system of record for electric motors: register, service history, maintenance logs, and RFQs to repair shops.",
  },
  {
    question: "Is there a free tier?",
    answer: `Yes. Free includes all features for up to ${IQMOTORTRACK_FREE_MOTOR_LIMIT} motors. Adding a sixth motor requires Pro.`,
  },
  {
    question: "How much is Pro?",
    answer: `Pro is $${IQMOTORTRACK_MONTHLY_USD} per month billed through PayPal. You get unlimited motors. Cancel anytime from Profile.`,
  },
  {
    question: "How do I open it on my phone?",
    answer:
      "Scan the QR code on this page or open /Track in Safari or Chrome, then Add to Home Screen / Install app. It runs as a PWA.",
  },
  {
    question: "Is this the same login as IQMotorBase shop software?",
    answer:
      "No. IQMotorTrack is a separate plant login. Shop users stay in IQMotorBase. Plants never log into the shop app.",
  },
];
