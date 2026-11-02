export const LISTING_MARKETING_TEMPLATE_KEYS = [
  "initial",
  "followup1",
  "followup2",
  "followup3",
  "restart",
];

export const LISTING_MARKETING_TEMPLATE_META = {
  initial: { name: "Initial", label: "1. Initial" },
  followup1: { name: "Follow-up 1", label: "2. Follow-up 1" },
  followup2: { name: "Follow-up 2", label: "3. Follow-up 2" },
  followup3: { name: "Follow-up 3", label: "4. Follow-up 3" },
  restart: { name: "Restart / win-back", label: "5. Restart / win-back" },
};

export const LISTING_MARKETING_DAILY_LIMIT = 100;
export const LISTING_MARKETING_FOLLOW_UP_DAYS = 3;
/** After initial/restart + 3 follow-ups, emailsInCycle is 4 and auto-send stops. */
export const LISTING_MARKETING_MAX_EMAILS_IN_CYCLE = 4;

export function templateKeyForEmailsInCycle(emailsInCycleBeforeSend, awaitingRestart) {
  if (awaitingRestart) return "restart";
  if (emailsInCycleBeforeSend <= 0) return "initial";
  if (emailsInCycleBeforeSend === 1) return "followup1";
  if (emailsInCycleBeforeSend === 2) return "followup2";
  if (emailsInCycleBeforeSend === 3) return "followup3";
  return null;
}
