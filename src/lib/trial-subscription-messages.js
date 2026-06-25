/** Client-safe constants for the self-signup trial subscription tier. */

export const TRIAL_PLAN_SLUG = "trial";

/** Maximum customers a trial shop may save. */
export const TRIAL_MAX_CUSTOMERS = 3;

export const TRIAL_CUSTOMER_CAP_CODE = "TRIAL_CUSTOMER_CAP";

export const TRIAL_UPGRADE_TITLE = "Trial subscription limit";

export const TRIAL_UPGRADE_BODY =
  "Your Trial subscription includes full CRM access with up to 3 saved customers. To add more customers and unlock unlimited capacity, upgrade your subscription.";

export const TRIAL_UPGRADE_CONTACT_LABEL = "Contact us to upgrade";

export function isTrialCustomerCapResponse(res, data) {
  return Number(res?.status) === 403 && data?.code === TRIAL_CUSTOMER_CAP_CODE;
}
